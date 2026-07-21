import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaThumb } from "@/components/media-thumb";
import { TIPO_LABEL, FASE_LABEL, objetivoLabel, type Post } from "@/lib/types";
import { FASE_CHIP } from "@/components/tipo-colors";

// Un día de la agenda: el feed (todo lo que no es historia) + la secuencia de
// historias de esa misma fecha. La secuencia no es un modelo aparte: son las
// piezas tipo 'historia' del día, ordenadas por position.
type Dia = { key: string; label: string; feed: Post[]; stories: Post[] };

const SIN_FECHA = "sin-fecha";

// "2026-07-01" -> "Miércoles 01". Se parsea a mano para no comerse el desfase
// de timezone que mete new Date("YYYY-MM-DD") (igual que formatPublishDate).
function labelDia(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dia = dt.toLocaleDateString("es-AR", { weekday: "long" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${String(d).padStart(2, "0")}`;
}

function agrupar(posts: Post[]): Dia[] {
  const mapa = new Map<string, Post[]>();
  for (const p of posts) {
    const key = p.publish_date?.slice(0, 10) ?? SIN_FECHA;
    mapa.set(key, [...(mapa.get(key) ?? []), p]);
  }

  const claves = [...mapa.keys()].sort((a, b) => {
    // Las piezas sin fecha van al final, no al principio.
    if (a === SIN_FECHA) return 1;
    if (b === SIN_FECHA) return -1;
    return a.localeCompare(b);
  });

  return claves.map((key) => {
    const delDia = mapa.get(key)!;
    const orden = (a: Post, b: Post) => a.position - b.position;
    return {
      key,
      label: key === SIN_FECHA ? "Sin fecha" : labelDia(key),
      feed: delDia.filter((p) => p.tipo !== "historia").sort(orden),
      stories: delDia.filter((p) => p.tipo === "historia").sort(orden),
    };
  });
}

export function AgendaView({
  posts,
  thumbs,
  hrefBase,
}: {
  posts: Post[];
  thumbs: Record<string, string | null>;
  hrefBase: string;
}) {
  const dias = agrupar(posts);

  return (
    <div className="flex flex-col gap-4">
      {dias.map((dia) => (
        <section key={dia.key} className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Cabecera del día: fecha + los objetivos de las piezas del feed */}
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-4 py-3">
            <h3 className="font-semibold">{dia.label}</h3>
            <p className="text-sm text-muted-foreground">
              {[...new Set(dia.feed.map(objetivoLabel))].join(" · ")}
            </p>
          </header>

          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr]">
            {/* FEED */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-accent">FEED</p>
              {dia.feed.length ? (
                dia.feed.map((p) => (
                  <Link
                    key={p.id}
                    href={`${hrefBase}${p.id}`}
                    className="flex overflow-hidden rounded-lg border border-border transition-colors hover:border-accent/50"
                  >
                    {/* self-stretch: la miniatura toma el alto completo de la tarjeta. */}
                    <div className="relative w-24 shrink-0 self-stretch">
                      <MediaThumb tipo={p.tipo} url={thumbs[p.id]} previewBg={p.preview_bg} previewText={p.preview_text} fill className="rounded-none" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 p-3">
                      <span className="truncate text-sm font-medium">{TIPO_LABEL[p.tipo]}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge estado={p.estado} />
                        <Badge className={FASE_CHIP[p.fase]}>
                          {FASE_LABEL[p.fase]}
                        </Badge>
                      </div>
                      {p.copy && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{p.copy}</p>
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Sin pieza de feed.</p>
              )}
            </div>

            {/* STORIES · SECUENCIA */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                STORIES · SECUENCIA
              </p>
              {dia.stories.length ? (
                <div className="flex flex-wrap gap-2">
                  {dia.stories.map((p, i) => (
                    // La imagen va a sangre; el número y el objetivo se superponen
                    // sobre degradados para que se lean en cualquier foto.
                    <Link
                      key={p.id}
                      href={`${hrefBase}${p.id}`}
                      className="relative block aspect-[9/16] w-20 overflow-hidden rounded-lg border border-border transition-colors hover:border-accent/50"
                    >
                      <MediaThumb tipo={p.tipo} url={thumbs[p.id]} previewBg={p.preview_bg} previewText={p.preview_text} fill className="rounded-none" />
                      <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] font-medium text-white backdrop-blur-sm">
                        {i + 1}
                      </span>
                      <span
                        title={objetivoLabel(p)}
                        className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1 pb-1 pt-3 text-center text-[10px] font-medium text-white"
                      >
                        {objetivoLabel(p)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin historias este día.</p>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
