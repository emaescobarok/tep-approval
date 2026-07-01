import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, CalendarDays } from "lucide-react";
import { formatPublishDate } from "@/lib/utils";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/media";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/components/comment-thread";
import {
  TIPO_LABEL,
  type Comment,
  type Post,
  type PostMedia,
} from "@/lib/types";
import { approvePost, requestChanges, addComment } from "./actions";

export default async function PiezaPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  await requireClient();
  const { postId } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  if (!post) notFound(); // RLS: si no es de su cliente, no lo ve

  const p = post as Post;

  const { data: mediaRows } = await supabase
    .from("post_media").select("*").eq("post_id", postId).order("position");
  const media = (mediaRows as PostMedia[]) ?? [];
  const urls = await Promise.all(media.map((m) => signedUrl(supabase, m.storage_path)));
  const coverUrl = p.cover_path ? await signedUrl(supabase, p.cover_path) : null;

  const { data: commentRows } = await supabase
    .from("comments").select("*").eq("post_id", postId).order("created_at");
  const comments = (commentRows as Comment[]) ?? [];

  const approve = approvePost.bind(null, postId);
  const reqChanges = requestChanges.bind(null, postId);
  const comment = addComment.bind(null, postId);

  return (
    <>
      <Topbar title="Detalle de pieza" subtitle={TIPO_LABEL[p.tipo]} />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Link href="/client/calendario" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver al calendario
        </Link>

        {/* Media (izquierda) + copy/decisión/comentarios (derecha) */}
        <Card>
          <CardContent className="grid gap-6 p-5 md:grid-cols-[1.3fr_1fr]">
            {/* Media (portada + archivos) */}
            <div className="flex flex-col gap-2">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Portada" className="w-full rounded-xl" />
              )}
              {media.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {media.map((m, i) =>
                    m.media_type === "video" ? (
                      <video key={m.id} src={urls[i] ?? undefined} controls className="w-full rounded-xl" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={urls[i] ?? undefined} alt="" className="w-full rounded-xl object-cover" />
                    )
                  )}
                </div>
              ) : (
                !coverUrl && (
                  <div className="flex h-full min-h-40 items-center justify-center rounded-xl bg-secondary/50 text-sm text-muted-foreground">
                    El archivo puede estar en Drive
                  </div>
                )
              )}
            </div>

            {/* Copy + decisión + comentarios */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge>{TIPO_LABEL[p.tipo]}</Badge>
                <StatusBadge estado={p.estado} />
              </div>
              {p.publish_date && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> Se publica el {formatPublishDate(p.publish_date)}
                </p>
              )}
              {p.copy && (
                <div>
                  <p className="mb-1 text-sm font-medium">Copy</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.copy}</p>
                </div>
              )}
              {p.drive_url && (
                <a
                  href={p.drive_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-4" /> Ver archivo en Drive
                </a>
              )}

              {/* Decisión */}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {p.estado !== "aprobado" && (
                  <form action={approve}>
                    <Button type="submit" className="w-full">Aprobar pieza</Button>
                  </form>
                )}
                <form action={reqChanges} className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Pedir cambios</label>
                  <textarea
                    name="comment" required rows={3}
                    placeholder="Contanos qué querés ajustar..."
                    className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" variant="warning" className="w-full">
                    Enviar corrección
                  </Button>
                </form>
              </div>

              {/* Comentarios */}
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium">Comentarios</p>
                <CommentThread comments={comments} />
                <form action={comment} className="flex flex-col gap-2">
                  <textarea
                    name="comment" required rows={2}
                    placeholder="Escribir un comentario..."
                    className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" variant="outline" size="sm" className="self-end">
                    Comentar
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
