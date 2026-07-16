import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, CalendarDays } from "lucide-react";
import { NavArrow } from "@/components/nav-arrow";
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
import { CommentComposer } from "@/components/comment-composer";
import { getPostParticipants } from "@/lib/mentions";
import {
  TIPO_LABEL,
  objetivoLabel,
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

  // Piezas vecinas del mismo calendario, ordenadas por fecha (menor a mayor)
  // para poder navegar con flechas. Las sin fecha van al final.
  const { data: siblingRows } = await supabase
    .from("posts")
    .select("id, publish_date, position")
    .eq("calendar_id", p.calendar_id)
    .order("publish_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  const siblings = (siblingRows as { id: string }[]) ?? [];
  const idx = siblings.findIndex((s) => s.id === postId);
  const prevId = idx > 0 ? siblings[idx - 1].id : null;
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  const { data: mediaRows } = await supabase
    .from("post_media").select("*").eq("post_id", postId).order("position");
  const media = (mediaRows as PostMedia[]) ?? [];
  const urls = await Promise.all(media.map((m) => signedUrl(supabase, m.storage_path)));
  const coverUrl = p.cover_path ? await signedUrl(supabase, p.cover_path) : null;

  const { data: commentRows } = await supabase
    .from("comments").select("*").eq("post_id", postId).order("created_at");
  const comments = (commentRows as Comment[]) ?? [];
  const participants = await getPostParticipants(postId);

  const approve = approvePost.bind(null, postId);
  const reqChanges = requestChanges.bind(null, postId);
  const comment = addComment.bind(null, postId);

  return (
    <>
      <Topbar title="Detalle de pieza" subtitle={TIPO_LABEL[p.tipo]} />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/client/calendario" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver al calendario
          </Link>
          {siblings.length > 1 && (
            <div className="flex items-center gap-1">
              {idx >= 0 && (
                <span className="mr-1 text-xs text-muted-foreground">
                  {idx + 1} de {siblings.length}
                </span>
              )}
              <NavArrow href={prevId ? `/client/pieza/${prevId}` : null} label="Pieza anterior">
                <ChevronLeft className="size-5" />
              </NavArrow>
              <NavArrow href={nextId ? `/client/pieza/${nextId}` : null} label="Pieza siguiente">
                <ChevronRight className="size-5" />
              </NavArrow>
            </div>
          )}
        </div>

        {/* Media (izquierda) + copy/decisión/comentarios (derecha) */}
        <Card>
          <CardContent className="grid gap-6 p-5 md:grid-cols-[1.3fr_1fr]">
            {/* Media (portada + archivos) */}
            <div className="flex flex-col gap-2">
              {coverUrl && (
                <Image
                  src={coverUrl} alt="Portada" width={0} height={0}
                  sizes="(max-width: 768px) 100vw, 700px"
                  className="h-auto w-full rounded-xl"
                />
              )}
              {media.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {media.map((m, i) =>
                    m.media_type === "video" ? (
                      <video key={m.id} src={urls[i] ?? undefined} controls className="w-full rounded-xl" />
                    ) : (
                      <Image
                        key={m.id} src={urls[i] ?? ""} alt="" width={0} height={0}
                        sizes="(max-width: 768px) 50vw, 350px"
                        className="h-auto w-full rounded-xl object-cover"
                      />
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{TIPO_LABEL[p.tipo]}</Badge>
                  {objetivoLabel(p) && (
                    <Badge className="border-accent/30 bg-accent/10 text-accent">
                      {objetivoLabel(p)}
                    </Badge>
                  )}
                </div>
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
                <CommentThread comments={comments} participants={participants} />
                <CommentComposer
                  action={comment}
                  participants={participants}
                  placeholder="Escribir un comentario... (usá @ para mencionar)"
                />
                <p className="text-xs text-muted-foreground">Escribí @ para mencionar a alguien.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
