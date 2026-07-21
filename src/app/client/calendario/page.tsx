import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computePostMedia } from "@/lib/media";
import { Topbar } from "@/components/topbar";
import { ProgressSummary } from "@/components/progress-summary";
import { MonthSwitcher } from "@/components/month-switcher";
import { PostCard } from "@/components/post-card";
import { MonthCalendar } from "@/components/month-calendar";
import { ViewToggle } from "@/components/view-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeIntroHtml } from "@/lib/sanitize";
import { agruparParaGrilla } from "@/lib/posts";
import type { Post } from "@/lib/types";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; view?: string }>;
}) {
  const profile = await requireClient();
  const supabase = await createClient();

  const now = new Date();
  const sp = await searchParams;
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();
  const view = sp.view === "cal" ? "cal" : "grid";

  // El cliente y el calendario del mes no dependen entre sí (RLS ya garantiza
  // que el calendario sea del cliente correcto).
  const [{ data: client }, { data: calendar }] = await Promise.all([
    supabase.from("clients").select("name, logo_url").eq("id", profile.client_id!).single(),
    supabase
      .from("calendars")
      .select("id, intro")
      .eq("client_id", profile.client_id!)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
  ]);

  let posts: Post[] = [];
  let thumbs: Record<string, string | null> = {};
  let commentCounts: Record<string, number> = {};

  if (calendar) {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("calendar_id", calendar.id)
      .order("position", { ascending: true });
    posts = (data as Post[]) ?? [];

    // Media y conteo de comentarios no dependen entre sí.
    const ids = posts.map((p) => p.id);
    const [mediaData, { data: comments }] = await Promise.all([
      computePostMedia(supabase, posts),
      ids.length
        ? supabase.from("comments").select("post_id").in("post_id", ids)
        : Promise.resolve({ data: null }),
    ]);
    ({ thumbs } = mediaData);
    (comments as { post_id: string }[] | null)?.forEach((c) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;
    });
  }

  return (
    <>
      <Topbar
        title={client?.name ?? "Mi contenido"}
        subtitle="Revisá y aprobá tus piezas del mes"
        logoUrl={client?.logo_url}
        right={<MonthSwitcher month={month} year={year} basePath="/client/calendario" extraParams={{ view }} />}
      />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <ProgressSummary estados={posts.map((p) => p.estado)} />

        {/* Introducción de la planificación (la escribe el estratega) */}
        {calendar?.intro && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Planificación del mes</CardTitle></CardHeader>
            <CardContent>
              <div
                className="prose-intro text-sm leading-relaxed text-foreground/90"
                dangerouslySetInnerHTML={{ __html: sanitizeIntroHtml(calendar.intro) }}
              />
            </CardContent>
          </Card>
        )}

        {posts.length > 0 && (
          <>
            <div className="mt-6 flex justify-end">
              <ViewToggle
                view={view}
                basePath="/client/calendario"
                month={month}
                year={year}
                views={["grid", "cal"]}
              />
            </div>

            {view === "cal" ? (
              <div className="mt-4">
                <MonthCalendar posts={posts} month={month} year={year} hrefBase="/client/pieza/" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {agruparParaGrilla(posts).map(({ card, stories }) => (
                  <PostCard
                    key={card.id}
                    post={card}
                    href={`/client/pieza/${card.id}`}
                    thumbUrl={thumbs[card.id]}
                    commentCount={commentCounts[card.id]}
                    storiesCount={stories.length}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {posts.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            Todavía no hay contenido cargado para este mes.
          </div>
        )}
      </main>
    </>
  );
}
