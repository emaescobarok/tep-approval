import { Card } from "@/components/ui/card";
import type { PostEstado } from "@/lib/types";

export function ProgressSummary({ estados }: { estados: PostEstado[] }) {
  const total = estados.length;
  const aprobadas = estados.filter((e) => e === "aprobado").length;
  const pendientes = estados.filter((e) => e === "pendiente").length;
  const cambios = estados.filter((e) => e === "cambios_pedidos").length;
  const pct = total ? Math.round((aprobadas / total) * 100) : 0;

  const items = [
    { label: "Aprobadas", value: aprobadas, cls: "text-primary" },
    { label: "Pendientes", value: pendientes, cls: "text-muted-foreground" },
    { label: "Cambios pedidos", value: cambios, cls: "text-warning" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Aprobación del mes</p>
        <p className="mt-1 text-3xl font-semibold text-primary">{pct}%</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>
      {items.map((it) => (
        <Card key={it.label} className="p-5">
          <p className="text-sm text-muted-foreground">{it.label}</p>
          <p className={`mt-1 text-3xl font-semibold ${it.cls}`}>{it.value}</p>
        </Card>
      ))}
    </div>
  );
}
