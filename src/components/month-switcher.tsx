import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MESES } from "@/lib/types";

// Navegación de mes. basePath define la ruta a la que apunta (?month&year).
export function MonthSwitcher({
  month,
  year,
  basePath,
  extraParams = {},
}: {
  month: number;
  year: number;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const prev = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const next = month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  const build = (m: number, y: number) => {
    const params = new URLSearchParams({ ...extraParams, month: String(m), year: String(y) });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={build(prev.month, prev.year)}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-40 text-center text-sm font-medium">
        {MESES[month - 1]} {year}
      </span>
      <Link
        href={build(next.month, next.year)}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
