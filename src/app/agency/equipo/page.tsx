import { requireManager, isSuperAdmin, SUPER_ADMIN_EMAIL } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteBox } from "@/components/invite-box";
import { AssignmentPicker } from "./assignment-picker";
import { RoleSelect } from "./role-select";
import { DeleteAgencyUserButton } from "./delete-agency-user-button";
import { inviteStrategist, invitePM } from "./actions";
import { AGENCY_TIER_LABEL, agencyTier } from "@/lib/types";
import { ShieldCheck, Briefcase } from "lucide-react";

export default async function EquipoPage() {
  const me = await requireManager();
  const isAdmin = me.is_admin;
  const iAmSuper = await isSuperAdmin();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, is_pm")
    .eq("role", "agency")
    .order("created_at");

  // Email de cada miembro (vive en auth.users) para identificar al super admin.
  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.id);
      if (data?.user?.email) emailById.set(m.id, data.user.email.toLowerCase());
    })
  );

  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  const { data: assignments } = await supabase
    .from("client_assignments")
    .select("agency_id, client_id");

  const assignedSet = new Set((assignments ?? []).map((a) => `${a.agency_id}:${a.client_id}`));

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Equipo</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Roles del equipo y a qué cuentas accede cada estratega"
            : "Asigná estrategas a las cuentas que gestionás"}
        </p>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          {(members ?? []).map((m) => {
            const tier = agencyTier(m);
            const isSuperMember = emailById.get(m.id) === SUPER_ADMIN_EMAIL;
            const canDelete = iAmSuper && !isSuperMember && m.id !== me.id;
            return (
              <Card key={m.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {m.full_name ?? AGENCY_TIER_LABEL[tier]}
                    </CardTitle>
                    {tier === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        <ShieldCheck className="size-3.5" /> Administrador
                      </span>
                    )}
                    {tier === "pm" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                        <Briefcase className="size-3.5" /> Project Manager
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <RoleSelect agencyId={m.id} tier={tier} locked={isSuperMember || m.id === me.id} />
                      {canDelete && (
                        <DeleteAgencyUserButton
                          agencyId={m.id}
                          userName={m.full_name ?? "este miembro"}
                        />
                      )}
                    </div>
                  )}
                </CardHeader>
                {(tier === "strategist" || (isAdmin && tier === "pm")) && (
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      {tier === "pm"
                        ? "Cuentas que gestiona (asignale las que va a manejar):"
                        : "Cuentas asignadas:"}
                    </p>
                    <AssignmentPicker
                      agencyId={m.id}
                      clients={clients ?? []}
                      assignedIds={(clients ?? [])
                        .filter((c) => assignedSet.has(`${m.id}:${c.id}`))
                        .map((c) => c.id)}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Invitar estratega</CardTitle></CardHeader>
            <CardContent>
              <InviteBox
                action={inviteStrategist}
                label="Email del estratega"
                cta="Invitar al equipo"
              />
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader><CardTitle className="text-base">Invitar Project Manager</CardTitle></CardHeader>
              <CardContent>
                <InviteBox
                  action={invitePM}
                  label="Email del Project Manager"
                  cta="Invitar como PM"
                />
              </CardContent>
            </Card>
          )}
        </aside>
      </main>
    </>
  );
}
