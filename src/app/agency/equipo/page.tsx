import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteBox } from "@/components/invite-box";
import { AssignmentToggle } from "./assignment-toggle";
import { RoleSelect } from "./role-select";
import { inviteStrategist, invitePM } from "./actions";
import { AGENCY_TIER_LABEL, agencyTier } from "@/lib/types";
import { ShieldCheck, Briefcase } from "lucide-react";

export default async function EquipoPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, is_pm")
    .eq("role", "agency")
    .order("created_at");

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
          Roles del equipo y a qué clientes accede cada estratega
        </p>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          {(members ?? []).map((m) => {
            const tier = agencyTier(m);
            return (
              <Card key={m.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {m.full_name ?? AGENCY_TIER_LABEL[tier]}
                    </CardTitle>
                    {tier === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        <ShieldCheck className="size-3.5" /> Admin — ve todo
                      </span>
                    )}
                    {tier === "pm" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                        <Briefcase className="size-3.5" /> Project Manager
                      </span>
                    )}
                  </div>
                  <RoleSelect agencyId={m.id} tier={tier} />
                </CardHeader>
                {tier === "strategist" && (
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Clientes asignados:</p>
                    <div className="flex flex-wrap gap-2">
                      {(clients ?? []).map((c) => (
                        <AssignmentToggle
                          key={c.id}
                          agencyId={m.id}
                          clientId={c.id}
                          clientName={c.name}
                          initial={assignedSet.has(`${m.id}:${c.id}`)}
                        />
                      ))}
                      {(clients ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">No hay clientes.</span>
                      )}
                    </div>
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
        </aside>
      </main>
    </>
  );
}
