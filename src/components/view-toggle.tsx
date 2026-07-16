import Link from "next/link";
import { LayoutGrid, CalendarDays, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "grid" | "cal" | "agenda";

// Alterna entre la grilla de piezas, el calendario del mes y la agenda por día.
// Preserva month/year en la URL vía ?view=.
export function ViewToggle({
  view,
  basePath,
  month,
  year,
}: {
  view: View;
  basePath: string;
  month: number;
  year: number;
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
      <Link href={build("grid")} className={cn(base, view === "grid" ? active : inactive)}>
        <LayoutGrid className="size-4" /> Grilla
      </Link>
      <Link href={build("cal")} className={cn(base, view === "cal" ? active : inactive)}>
        <CalendarDays className="size-4" /> Calendario
      </Link>
      <Link href={build("agenda")} className={cn(base, view === "agenda" ? active : inactive)}>
        <ListOrdered className="size-4" /> Agenda
      </Link>
    </div>
  );
}
