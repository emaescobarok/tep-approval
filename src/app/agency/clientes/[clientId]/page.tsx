import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgency, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeThumbs } from "@/lib/media";
import { MonthSwitcher } from "@/components/month-switcher";
import { MediaThumb } from "@/components/media-thumb";
import { FeedPreview } from "@/components/feed-preview";
import { MonthCalendar } from "@/components/month-calendar";
import { ViewToggle } from "@/components/view-toggle";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MESES, TIPO_LABEL, type Post } from "@/lib/types";
import { NewPostForm } from "./new-post-form";
import { InviteForm } from "./invite-form";
import { AssignmentToggle } from "../../equipo/assignment-toggle";
import { DeletePostButton } from "./delete-post-button";
import { DeleteUserButton } from "./delete-user-button";
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
  searchParams: Promise<{ month?: string; year?: string; view?: string }>;
}) {
  const profile = await requireAgency();
  const { clientId } = await params;
  const supabase = await createClient();

  const now = new Date();
  const sp = await searchParams;
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();
  const view = sp.view === "cal" ? "cal" : "grid";

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: users } = await supabase
    .from("profiles").select("id, full_name").eq("client_id", clientId);

  const manager = canManage(profile);

  // Estrategas de la agencia y cuáles están asignados a esta cuenta
  // (solo se usa/renderiza para managers).
  let strategists: { id: string; full_name: string | null }[] = [];
  let assignedStrategistIds = new Set<string>();
  if (manager) {
    const { data: strat } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "agency").eq("is_admin", false).eq("is_pm", false)
      .order("created_at");
    strategists = strat ?? [];
    const { data: asg } = await supabase
      .from("client_assignments").select("agency_id").eq("client_id", clientId);
    assignedStrategistIds = new Set((asg ?? []).map((a) => a.agency_id));
  }

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
      <header className="md:sticky md:top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <ClientLogo name={client.name} logoUrl={client.logo_url} className="size-11" />
          <div>
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              Contenido de {MESES[month - 1]} {year}
            </p>
          </div>
        </div>
        <MonthSwitcher month={month} year={year} basePath={`/agency/clientes/${clientId}`} extraParams={{ view }} />
      </header>

      {canManage(profile) && (
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Piezas del mes ({posts.length})
              </h2>
              {posts.length > 0 && (
                <ViewToggle view={view} basePath={`/agency/clientes/${clientId}`} month={month} year={year} />
              )}
            </div>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                Sin piezas. Cargá la primera desde el panel de la derecha.
              </div>
            ) : view === "cal" ? (
              <MonthCalendar posts={posts} month={month} year={year} hrefBase="/agency/piezas/" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {posts.map((post) => (
                  <div key={post.id} className="group flex flex-col gap-1.5">
                    {/* Imagen protagonista (clickeable, abre el detalle) */}
                    <Link
                      href={`/agency/piezas/${post.id}`}
                      className="relative block aspect-[4/5] overflow-hidden rounded-xl"
                    >
                      <MediaThumb tipo={post.tipo} url={thumbs[post.id]} fill className="transition-transform duration-200 group-hover:scale-[1.03]" />
                      {/* Fecha + tipo sobre la imagen */}
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-black/50 to-transparent p-2">
                        <Badge className="bg-black/50 text-white backdrop-blur-sm">{TIPO_LABEL[post.tipo]}</Badge>
                        {post.publish_date && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white drop-shadow">
                            <CalendarDays className="size-3" /> {formatPublishDate(post.publish_date)}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Meta compacta debajo (sin copy: aparece al abrir la pieza) */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge estado={post.estado} />
                        {post.drive_url && (
                          <a
                            href={post.drive_url} target="_blank" rel="noopener noreferrer"
                            title="Ver en Drive"
                            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" /> Drive
                          </a>
                        )}
                      </div>
                      <DeletePostButton postId={post.id} clientId={clientId} />
                    </div>
                  </div>
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
            <CardHeader><CardTitle className="text-base">Usuarios de la cuenta</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1 text-sm">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="truncate">{u.full_name ?? "Usuario invitado"}</span>
                    {manager && (
                      <DeleteUserButton
                        clientId={clientId}
                        userId={u.id}
                        userName={u.full_name ?? "este usuario"}
                      />
                    )}
                  </li>
                ))}
                {(users ?? []).length === 0 && (
                  <li className="text-muted-foreground">Sin usuarios todavía.</li>
                )}
              </ul>
              {manager && <InviteForm clientId={clientId} />}
            </CardContent>
          </Card>

          {manager && (
            <Card>
              <CardHeader><CardTitle className="text-base">Estrategas en esta cuenta</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Quiénes pueden trabajar el contenido de esta cuenta:</p>
                <div className="flex flex-wrap gap-2">
                  {strategists.map((s) => (
                    <AssignmentToggle
                      key={s.id}
                      agencyId={s.id}
                      clientId={clientId}
                      clientName={s.full_name ?? "Estratega"}
                      initial={assignedStrategistIds.has(s.id)}
                    />
                  ))}
                  {strategists.length === 0 && (
                    <span className="text-sm text-muted-foreground">No hay estrategas en el equipo.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </main>
    </>
  );
}
