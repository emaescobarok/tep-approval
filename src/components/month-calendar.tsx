import Link from "next/link";
import { TIPO_LABEL, ESTADO_LABEL, type Post, type PostEstado } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Punto de color por estado (mismo criterio que StatusBadge).
const dot: Record<PostEstado, string> = {
  pendiente: "bg-muted-foreground",
  aprobado: "bg-primary",
  cambios_pedidos: "bg-warning",
};

// Calendario del mes: cada pieza aparece en el día en que se publica.
// hrefBase + post.id arma el link al detalle de la pieza.
export function MonthCalendar({
  posts,
  month,
  year,
  hrefBase,
}: {
  posts: Post[];
  month: number;
  year: number;
  hrefBase: string;
}) {
  // Agrupa por día del mes según publish_date ("YYYY-MM-DD").
  const byDay = new Map<number, Post[]>();
  const undated: Post[] = [];
  for (const p of posts) {
    if (!p.publish_date) {
      undated.push(p);
      continue;
    }
    const [y, m, d] = p.publish_date.split("-").map(Number);
    if (m !== month || y !== year) continue;
    const arr = byDay.get(d) ?? [];
    arr.push(p);
    byDay.set(d, arr);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  // Índice del primer día de la semana con inicio en lunes (0=Lun … 6=Dom).
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto px-1">
      <div className="grid min-w-[560px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-card py-1.5 text-center text-[11px] font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              "min-h-20 bg-card p-1.5 sm:min-h-24",
              day === null && "bg-muted/30"
            )}
          >
            {day !== null && (
              <>
                <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
                <div className="mt-1 flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map((p) => (
                    <Link
                      key={p.id}
                      href={`${hrefBase}${p.id}`}
                      title={`${TIPO_LABEL[p.tipo]} · ${ESTADO_LABEL[p.estado]}`}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-[10px] font-medium leading-tight hover:bg-secondary"
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", dot[p.estado])} />
                      <span className="truncate">{TIPO_LABEL[p.tipo]}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      </div>

      {undated.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {undated.length} pieza(s) sin fecha asignada (no aparecen en el calendario).
        </p>
      )}
    </div>
  );
}
