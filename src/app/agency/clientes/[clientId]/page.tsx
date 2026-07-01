import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeThumbs } from "@/lib/media";
import { MonthSwitcher } from "@/components/month-switcher";
import { MediaThumb } from "@/components/media-thumb";
import { FeedPreview } from "@/components/feed-preview";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MESES, TIPO_LABEL, type Post } from "@/lib/types";
import { NewPostForm } from "./new-post-form";
import { InviteForm } from "./invite-form";
import { DeletePostButton } from "./delete-post-button";
import { IntroEditor } from "./intro-editor";
import { EditClientForm } from "./edit-client-form";
import { ClientLogo } from "@/components/client-logo";
import { formatPublishDate } from "@/lib/utils";
import { ExternalLink, CalendarDays } from "lucide-react";

export default async function AgencyClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await requireAgency();
  const { clientId } = await params;
  const supabase = await createClient();

  const now = new Date();
  const sp = await searchParams;
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: users } = await supabase
    .from("profiles").select("id, full_name").eq("client_id", clientId);

  const { data: calendar } = await supabase
    .from("calendars").select("id, intro")
    .eq("client_id", clientId).eq("month", month).eq("year", year).maybeSingle();

  let posts: Post[] = [];
  let thumbs: Record<string, string | null> = {};
  if (calendar) {
    const { data } = await supabase
      .from("posts").select("*").eq("calendar_id", calendar.id).order("position");
    posts = (data as Post[]) ?? [];
    thumbs = await computeThumbs(supabase, posts);
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <ClientLogo name={client.name} logoUrl={client.logo_url} className="size-11" />
          <div>
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              Contenido de {MESES[month - 1]} {year}
            </p>
          </div>
        </div>
        <MonthSwitcher month={month} year={year} basePath={`/agency/clientes/${clientId}`} />
      </header>

      {profile.is_admin && (
        <div className="mx-auto flex max-w-6xl px-6 pt-4">
          <EditClientForm client={client} />
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_340px]">
        {/* Grilla de piezas */}
        <section className="flex flex-col gap-6">
          {/* Introducción de la planificación */}
          <Card>
            <CardHeader><CardTitle className="text-base">Introducción de la planificación</CardTitle></CardHeader>
            <CardContent>
              <IntroEditor
                clientId={clientId}
                month={month}
                year={year}
                initial={calendar?.intro ?? null}
              />
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Piezas del mes ({posts.length})
            </h2>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                Sin piezas. Cargá la primera desde el panel de la derecha.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden p-3">
                    {/* Zona clickeable que abre el detalle */}
                    <Link href={`/agency/piezas/${post.id}`} className="group block">
                      <MediaThumb tipo={post.tipo} url={thumbs[post.id]} className="transition-opacity group-hover:opacity-90" />
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge>{TIPO_LABEL[post.tipo]}</Badge>
                          {post.publish_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="size-3" /> {formatPublishDate(post.publish_date)}
                            </span>
                          )}
                        </div>
                        {post.copy && <p className="line-clamp-2 text-sm text-muted-foreground">{post.copy}</p>}
                      </div>
                    </Link>
                    {/* Zona no-clickeable (links/botones propios) */}
                    <div className="mt-2 flex flex-col gap-2">
                      {post.drive_url && (
                        <a
                          href={post.drive_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> Ver en Drive
                        </a>
                      )}
                      <div className="flex items-center justify-between">
                        <StatusBadge estado={post.estado} />
                        <DeletePostButton postId={post.id} clientId={clientId} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Panel derecho: preview, subir pieza, invitar usuarios */}
        <aside className="flex flex-col gap-6">
          {posts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Vista previa del feed</CardTitle></CardHeader>
              <CardContent>
                <FeedPreview posts={posts} thumbs={thumbs} handle={client.name} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Nueva pieza</CardTitle></CardHeader>
            <CardContent>
              <NewPostForm clientId={clientId} month={month} year={year} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Usuarios del cliente</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1 text-sm">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="text-muted-foreground">
                    {u.full_name ?? "Usuario invitado"}
                  </li>
                ))}
                {(users ?? []).length === 0 && (
                  <li className="text-muted-foreground">Sin usuarios todavía.</li>
                )}
              </ul>
              <InviteForm clientId={clientId} />
            </CardContent>
          </Card>
        </aside>
      </main>
    </>
  );
}
