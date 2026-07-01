import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostMedia } from "@/lib/types";

// Genera una URL firmada temporal para un archivo del bucket privado.
export async function signedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("post-media")
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
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
