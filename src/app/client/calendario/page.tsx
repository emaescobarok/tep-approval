import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeThumbs } from "@/lib/media";
import { Topbar } from "@/components/topbar";
import { ProgressSummary } from "@/components/progress-summary";
import { MonthSwitcher } from "@/components/month-switcher";
import { PostCard } from "@/components/post-card";
import { FeedPreview } from "@/components/feed-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Post } from "@/lib/types";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await requireClient();
  const supabase = await createClient();

  const now = new Date();
  const sp = await searchParams;
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();

  const { data: client } = await supabase
    .from("clients")
    .select("name, logo_url")
    .eq("id", profile.client_id!)
    .single();

  // Calendario del mes (RLS ya garantiza que sea del cliente correcto)
  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, intro")
    .eq("client_id", profile.client_id!)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

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

    thumbs = await computeThumbs(supabase, posts);

    const ids = posts.map((p) => p.id);
    if (ids.length) {
      const { data: comments } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", ids);
      (comments as { post_id: string }[] | null)?.forEach((c) => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;
      });
    }
  }

  return (
    <>
      <Topbar
        title={client?.name ?? "Mi contenido"}
        subtitle="Revisá y aprobá tus piezas del mes"
        logoUrl={client?.logo_url}
        right={<MonthSwitcher month={month} year={year} basePath="/client/calendario" />}
      />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <ProgressSummary estados={posts.map((p) => p.estado)} />

        {/* Introducción de la planificación (la escribe el estratega) */}
        {calendar?.intro && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Planificación del mes</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {calendar.intro}
              </p>
            </CardContent>
          </Card>
        )}

        {posts.length > 0 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid h-fit grid-cols-2 gap-4 sm:grid-cols-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  href={`/client/pieza/${post.id}`}
                  thumbUrl={thumbs[post.id]}
                  commentCount={commentCounts[post.id]}
                />
              ))}
            </div>
            <Card className="h-fit">
              <CardHeader><CardTitle className="text-base">Vista previa del feed</CardTitle></CardHeader>
              <CardContent><FeedPreview posts={posts} thumbs={thumbs} handle={client?.name ?? "cuenta"} /></CardContent>
            </Card>
          </div>
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
