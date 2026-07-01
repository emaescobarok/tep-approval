import { MediaThumb } from "@/components/media-thumb";
import type { Post } from "@/lib/types";
import { Play, LayoutGrid } from "lucide-react";

// Ordena por fecha de publicación (las sin fecha van al final), luego por posición.
function sortForFeed(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.publish_date && b.publish_date) {
      return a.publish_date < b.publish_date ? -1 : a.publish_date > b.publish_date ? 1 : 0;
    }
    if (a.publish_date) return -1;
    if (b.publish_date) return 1;
    return a.position - b.position;
  });
}

// Vista previa del feed: grilla estilo Instagram (3 columnas, retrato 4:5).
export function FeedPreview({
  posts,
  thumbs,
}: {
  posts: Post[];
  thumbs: Record<string, string | null>;
  // handle se acepta por compatibilidad, ya no se usa.
  handle?: string;
}) {
  if (posts.length === 0) return null;
  const ordered = sortForFeed(posts);

  return (
    <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-[3px] overflow-hidden rounded-xl border border-border bg-border/40">
      {ordered.map((p) => (
        <div key={p.id} className="relative aspect-[4/5] bg-card">
          <MediaThumb tipo={p.tipo} url={thumbs[p.id]} fill className="!rounded-none" />
          {p.tipo === "reel_video" && (
            <Play className="absolute right-1.5 top-1.5 size-4 fill-white text-white drop-shadow" />
          )}
          {p.tipo === "carrusel" && (
            <LayoutGrid className="absolute right-1.5 top-1.5 size-4 text-white drop-shadow" />
          )}
        </div>
      ))}
    </div>
  );
}
