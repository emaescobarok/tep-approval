import Link from "next/link";
import { MediaThumb } from "@/components/media-thumb";
import { objetivoLabel, type Post } from "@/lib/types";

// Tira de historias de un día: cuadraditos 9:16 en secuencia, pegados a la pieza
// de feed. Cada uno linkea a su detalle. Reutiliza MediaThumb (imagen o
// placeholder de preview). Se muestra tanto en la grilla como en el detalle.
export function StoriesStrip({
  stories,
  thumbs,
  hrefBase,
}: {
  stories: Post[];
  thumbs: Record<string, string | null>;
  hrefBase: string;
}) {
  if (stories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {stories.map((s, i) => (
        <Link
          key={s.id}
          href={`${hrefBase}${s.id}`}
          title={objetivoLabel(s)}
          className="flex w-28 flex-col gap-1.5"
        >
          <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border transition-colors hover:border-accent/50">
            <MediaThumb
              tipo={s.tipo}
              url={thumbs[s.id]}
              previewBg={s.preview_bg}
              previewText={s.preview_text}
              fill
              className="rounded-none"
            />
            <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {i + 1}
            </span>
          </div>
          <span className="truncate text-center text-xs text-muted-foreground">
            {objetivoLabel(s)}
          </span>
        </Link>
      ))}
    </div>
  );
}
