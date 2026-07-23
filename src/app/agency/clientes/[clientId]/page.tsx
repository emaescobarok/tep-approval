import { notFound } from "next/navigation";
import { requireAgency, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computePostMedia } from "@/lib/media";
import { MonthSwitcher } from "@/components/month-switcher";
import { MonthCalendar } from "@/components/month-calendar";
import { ViewToggle, type View } from "@/components/view-toggle";
import { AgendaView } from "@/components/agenda-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MESES, type Post } from "@/lib/types";
import { agruparParaGrilla } from "@/lib/posts";
import { PostGrid } from "./post-grid";
import { NewPostDialog } from "./new-post-dialog";
import { InviteForm } from "./invite-form";
import { AssignmentToggle } from "../../equipo/assignment-toggle";
import { DeleteUserButton } from "./delete-user-button";
import { IntroEditor } from "./intro-editor";
import { EditClientForm } from "./edit-client-form";
import { ClientLogo } from "@/components/client-logo";

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
  const view: View = sp.view === "cal" ? "cal" : sp.view === "agenda" ? "agenda" : "grid";

  const manager = canManage(profile);

  // Tanda 1: nada de esto depende de lo otro, va todo junto. Los estrategas y
  // las asignaciones solo se renderizan para managers, así que ni se piden si no.
  const [{ data: client }, { data: memberRows }, { data: strat }, { data: asg }, { data: calendar }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      // Usuarios de la cuenta = miembros (no solo los que la tienen activa).
      supabase
        .from("client_members")
        .select("profile:profiles(id, full_name)")
        .eq("client_id", clientId),
      manager
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .eq("role", "agency").eq("is_admin", false).eq("is_pm", false)
            .order("created_at")
        : Promise.resolve({ data: null }),
      manager
        ? supabase.from("client_assignments").select("agency_id").eq("client_id", clientId)
        : Promise.resolve({ data: null }),
      supabase
        .from("calendars").select("id, intro")
        .eq("client_id", clientId).eq("month", month).eq("year", year).maybeSingle(),
    ]);
  if (!client) notFound();

  // Aplana los miembros a { id, full_name }. La membresía sin profile se descarta.
  const users = ((memberRows as { profile: { id: string; full_name: string | null } | null }[] | null) ?? [])
    .map((r) => r.profile)
    .filter((p): p is { id: string; full_name: string | null } => !!p);

  const strategists: { id: string; full_name: string | null }[] = strat ?? [];
  const assignedStrategistIds = new Set((asg ?? []).map((a) => a.agency_id));

  let posts: Post[] = [];
  let thumbs: Record<string, string | null> = {};
  if (calendar) {
    const { data } = await supabase
      .from("posts").select("*").eq("calendar_id", calendar.id).order("position");
    posts = (data as Post[]) ?? [];
    ({ thumbs } = await computePostMedia(supabase, posts));
  }

  return (
    <>
      <header className="md:sticky md:top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <ClientLogo name={client.name} logoUrl={client.logo_url} className="size-11 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{client.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              Contenido de {MESES[month - 1]} {year}
            </p>
          </div>
        </div>
        <MonthSwitcher month={month} year={year} basePath={`/agency/clientes/${clientId}`} extraParams={{ view }} />
      </header>

      {canManage(profile) && (
        <div className="mx-auto flex max-w-6xl px-4 pt-4 sm:px-6">
          <EditClientForm client={client} />
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Grilla de piezas */}
        <section className="flex min-w-0 flex-col gap-6">
          {/* Introducción de la planificación */}
          <Card>
            <CardHeader><CardTitle className="text-base">Introducción de la planificación</CardTitle></CardHeader>
            <CardContent>
              <IntroEditor
                // key por mes/año: al cambiar de mes, se re-monta con la intro
                // correcta en vez de conservar en estado la del mes anterior.
                key={`${clientId}-${month}-${year}`}
                clientId={clientId}
                month={month}
                year={year}
                initial={calendar?.intro ?? null}
              />
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Piezas del mes ({posts.length})
              </h2>
              <div className="flex items-center gap-2">
                {posts.length > 0 && (
                  <ViewToggle view={view} basePath={`/agency/clientes/${clientId}`} month={month} year={year} />
                )}
                <NewPostDialog clientId={clientId} month={month} year={year} />
              </div>
            </div>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                Sin piezas todavía. Creá la primera con el botón <span className="font-medium text-foreground">Crear pieza</span>.
              </div>
            ) : view === "cal" ? (
              <MonthCalendar posts={posts} month={month} year={year} hrefBase="/agency/piezas/" />
            ) : view === "agenda" ? (
              <AgendaView posts={posts} thumbs={thumbs} hrefBase="/agency/piezas/" />
            ) : (
              <PostGrid grupos={agruparParaGrilla(posts)} thumbs={thumbs} clientId={clientId} />
            )}
          </div>
        </section>

        {/* Panel derecho: usuarios, estrategas */}
        <aside className="flex flex-col gap-6">
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
