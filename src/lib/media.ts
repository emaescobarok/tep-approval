import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaTipo, Post, PostMedia } from "@/lib/types";

// Firma varias rutas del bucket privado en una sola llamada. Devuelve las URLs
// en el mismo orden que las rutas recibidas. No hay versión de a una a propósito:
// mapearla sobre una lista era un N+1 (una request HTTP por archivo).
export async function signedUrls(
  supabase: SupabaseClient,
  paths: string[],
  expiresIn = 3600
): Promise<(string | null)[]> {
  if (paths.length === 0) return [];
  const { data } = await supabase.storage.from("post-media").createSignedUrls(paths, expiresIn);
  return paths.map((_, i) => data?.[i]?.signedUrl ?? null);
}

export type MediaUrl = { url: string; mediaType: MediaTipo };

// Miniaturas + todas las media, con UNA query y UNA llamada de firma.
// Llamar computeThumbs y computeMediaUrls por separado consultaba post_media dos
// veces y firmaba la primera imagen de cada pieza dos veces. Usar esta cuando se
// necesitan las dos cosas (las vistas con FeedPreview); si solo hacen falta las
// miniaturas, computeThumbs sigue siendo más barata.
export async function computePostMedia(
  supabase: SupabaseClient,
  posts: Post[]
): Promise<{ thumbs: Record<string, string | null>; media: Record<string, MediaUrl[]> }> {
  const thumbs: Record<string, string | null> = {};
  const media: Record<string, MediaUrl[]> = {};
  if (posts.length === 0) return { thumbs, media };

  const { data } = await supabase
    .from("post_media")
    .select("post_id, storage_path, media_type")
    .in("post_id", posts.map((p) => p.id))
    .order("position");
  const rows = (data as Pick<PostMedia, "post_id" | "storage_path" | "media_type">[] | null) ?? [];

  // Un solo lote: todas las media + las portadas. Se firma cada ruta una vez.
  const covers = posts.filter((p) => p.cover_path).map((p) => p.cover_path!);
  const paths = [...rows.map((r) => r.storage_path), ...covers];
  const signed = await signedUrls(supabase, paths);

  rows.forEach((r, i) => {
    const url = signed[i];
    if (!url) return;
    media[r.post_id] = [...(media[r.post_id] ?? []), { url, mediaType: r.media_type }];
  });

  const coverUrl = new Map<string, string | null>();
  covers.forEach((path, i) => coverUrl.set(path, signed[rows.length + i]));

  // La miniatura es la portada si existe, si no la primera media (ya firmada).
  for (const p of posts) {
    thumbs[p.id] = p.cover_path
      ? coverUrl.get(p.cover_path) ?? null
      : media[p.id]?.[0]?.url ?? null;
  }

  return { thumbs, media };
}

// Calcula la miniatura de cada pieza: portada del reel si existe, si no la
// primera media subida. Firma TODAS las URLs en una sola llamada batch.
export async function computeThumbs(
  supabase: SupabaseClient,
  posts: Post[]
): Promise<Record<string, string | null>> {
  const thumbs: Record<string, string | null> = {};
  if (posts.length === 0) return thumbs;

  // Primera media para las piezas que no tienen portada (una sola query)
  const needMedia = posts.filter((p) => !p.cover_path).map((p) => p.id);
  const firstMedia: Record<string, string> = {};
  if (needMedia.length) {
    const { data: media } = await supabase
      .from("post_media")
      .select("post_id, storage_path")
      .in("post_id", needMedia)
      .order("position");
    (media as Pick<PostMedia, "post_id" | "storage_path">[] | null)?.forEach((m) => {
      if (!firstMedia[m.post_id]) firstMedia[m.post_id] = m.storage_path;
    });
  }

  // Ruta a firmar por pieza (portada o primera media)
  const entries: [string, string][] = [];
  for (const p of posts) {
    const path = p.cover_path ?? firstMedia[p.id];
    if (path) entries.push([p.id, path]);
  }
  if (entries.length === 0) return thumbs;

  // Una sola llamada batch para firmar todas las URLs
  const { data } = await supabase.storage
    .from("post-media")
    .createSignedUrls(entries.map(([, path]) => path), 3600);

  entries.forEach(([postId], i) => {
    thumbs[postId] = data?.[i]?.signedUrl ?? null;
  });

  return thumbs;
}
