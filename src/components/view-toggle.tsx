import Link from "next/link";
import { LayoutGrid, CalendarDays, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "grid" | "cal" | "agenda";

const META: Record<View, { label: string; icon: typeof LayoutGrid }> = {
  grid: { label: "Grilla", icon: LayoutGrid },
  cal: { label: "Calendario", icon: CalendarDays },
  agenda: { label: "Agenda", icon: ListOrdered },
};

// Alterna entre las vistas de piezas. Preserva month/year en la URL vía ?view=.
// `views` es explícito a propósito: la agenda solo existe del lado de la agencia,
// y cuando el toggle la ofrecía en todos lados el botón caía de vuelta a la grilla.
export function ViewToggle({
  view,
  basePath,
  month,
  year,
  views = ["grid", "cal", "agenda"],
}: {
  view: View;
  basePath: string;
  month: number;
  year: number;
  views?: View[];
}) {
  const build = (v: View) => {
    const params = new URLSearchParams({ month: String(month), year: String(year), view: v });
    return `${basePath}?${params.toString()}`;
  };

  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:bg-secondary";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      {views.map((v) => {
        const { label, icon: Icon } = META[v];
        return (
          <Link key={v} href={build(v)} className={cn(base, view === v ? active : inactive)}>
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </div>
  );
}
