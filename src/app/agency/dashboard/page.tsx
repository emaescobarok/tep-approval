import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/month-switcher";
import { MESES, type PostEstado } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { AddClientForm } from "./add-client-form";
import { DeleteClientButton } from "./delete-client-button";
import { ClientLogo } from "@/components/client-logo";

export default async function AgencyDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await requireAgency();
  const isAdmin = profile.is_admin;
  const supabase = await createClient();

  const now = new Date();
  const sp = await searchParams;
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();

  const { data: clients } = await supabase.from("clients").select("*").order("name");

  // Calendarios del mes seleccionado
  const { data: calendars } = await supabase
    .from("calendars")
    .select("id, client_id")
    .eq("month", month)
    .eq("year", year);

  const calByClient = new Map<string, string>();
  (calendars ?? []).forEach((c) => calByClient.set(c.client_id, c.id));

  const calIds = (calendars ?? []).map((c) => c.id);
  let estadosByCal: Record<string, PostEstado[]> = {};
  if (calIds.length) {
    const { data: posts } = await supabase
      .from("posts")
      .select("calendar_id, estado")
      .in("calendar_id", calIds);
    (posts ?? []).forEach((p) => {
      (estadosByCal[p.calendar_id] ??= []).push(p.estado as PostEstado);
    });
  }

  const rows = (clients ?? []).map((c) => {
    const calId = calByClient.get(c.id);
    const estados = calId ? estadosByCal[calId] ?? [] : [];
    const total = estados.length;
    const aprobadas = estados.filter((e) => e === "aprobado").length;
    const cambios = estados.filter((e) => e === "cambios_pedidos").length;
    const pct = total ? Math.round((aprobadas / total) * 100) : 0;
    return { client: c, total, aprobadas, cambios, pct };
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Estado de aprobaciones por cliente · {MESES[month - 1]} {year}
          </p>
        </div>
        <MonthSwitcher month={month} year={year} basePath="/agency/dashboard" />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {isAdmin && (
          <div className="mb-6">
            <AddClientForm />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ client, total, aprobadas, cambios, pct }) => (
            <div key={client.id} className="relative">
              {isAdmin && <DeleteClientButton clientId={client.id} clientName={client.name} />}
              <Link href={`/agency/clientes/${client.id}?month=${month}&year=${year}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ClientLogo name={client.name} logoUrl={client.logo_url} />
                      <CardTitle className="text-base">{client.name}</CardTitle>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-semibold text-primary">{pct}%</span>
                      <span className="text-sm text-muted-foreground">
                        {aprobadas}/{total} aprobadas
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    {cambios > 0 && (
                      <span className="text-xs font-medium text-warning-foreground">
                        {cambios} con cambios pedidos
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay clientes cargados todavía.</p>
          )}
        </div>
      </main>
    </>
  );
}
