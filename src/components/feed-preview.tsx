import { MediaThumb } from "@/components/media-thumb";
import { FeedLightbox, type FeedItem } from "@/components/feed-lightbox";
import { objetivoLabel, type Post } from "@/lib/types";
import type { MediaUrl } from "@/lib/media";
import { formatPublishDate } from "@/lib/utils";
import { Play, LayoutGrid } from "lucide-react";

// Ordena como el feed de Instagram: lo más reciente primero (fecha descendente).
// Las piezas sin fecha van al final, luego por posición.
function sortForFeed(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.publish_date && b.publish_date) {
      return a.publish_date > b.publish_date ? -1 : a.publish_date < b.publish_date ? 1 : 0;
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
  media,
}: {
  posts: Post[];
  thumbs: Record<string, string | null>;
  // Todas las media firmadas por pieza. Sin esto el botón "Ampliar" no aparece:
  // el lightbox necesita pasar las imágenes de un carrusel, no solo la miniatura.
  media?: Record<string, MediaUrl[]>;
  // handle se acepta por compatibilidad, ya no se usa.
  handle?: string;
}) {
  // Las historias no forman parte de la grilla del perfil, no van al feed.
  const feedPosts = posts.filter((p) => p.tipo !== "historia");
  if (feedPosts.length === 0) return null;
  const ordered = sortForFeed(feedPosts);

  const items: FeedItem[] = ordered.map((p) => {
    const thumb = thumbs[p.id] ?? null;
    const subidas = media?.[p.id] ?? [];
    return {
      id: p.id,
      tipo: p.tipo,
      copy: p.copy,
      objetivo: objetivoLabel(p),
      fecha: formatPublishDate(p.publish_date),
      thumb,
      // Una pieza puede no tener filas en post_media y aun así tener portada
      // (reel con cover + link de Drive). Sin este fallback el lightbox queda vacío.
      media: subidas.length ? subidas : thumb ? [{ url: thumb, mediaType: "image" as const }] : [],
    };
  });

  return (
    <div className="flex flex-col">
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
      {media && <FeedLightbox items={items} />}
    </div>
  );
}
