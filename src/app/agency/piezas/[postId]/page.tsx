import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Pencil } from "lucide-react";
import { NavArrow } from "@/components/nav-arrow";
import { EditPostForm } from "./edit-post-form";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls, computeThumbs } from "@/lib/media";
import { MediaThumb } from "@/components/media-thumb";
import { StoriesStrip } from "@/components/stories-strip";
import { FaseBar } from "@/components/fase-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/components/comment-thread";
import { CommentComposer } from "@/components/comment-composer";
import { getPostParticipants } from "@/lib/mentions";
import { DeletePostButton } from "../../clientes/[clientId]/delete-post-button";
import { TIPO_LABEL, objetivoLabel, type Comment, type Post, type PostMedia } from "@/lib/types";
import { formatPublishDate, cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { addAgencyComment, deleteComment } from "./actions";
import { updateFase } from "../../clientes/[clientId]/actions";

export default async function AgencyPiezaPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireAgency();
  const { postId } = await params;
  const { edit } = await searchParams;
  const editing = edit === "1";
  const supabase = await createClient();

  // Tanda 1: todo lo que solo depende de postId, en paralelo.
  const [{ data: post }, { data: mediaRows }, { data: commentRows }, participants] =
    await Promise.all([
      supabase.from("posts").select("*").eq("id", postId).maybeSingle(),
      supabase.from("post_media").select("*").eq("post_id", postId).order("position"),
      supabase.from("comments").select("*").eq("post_id", postId).order("created_at"),
      getPostParticipants(postId),
    ]);
  if (!post) notFound(); // RLS: si no tiene acceso, no lo ve

  const p = post as Post;
  const media = (mediaRows as PostMedia[]) ?? [];
  const comments = (commentRows as Comment[]) ?? [];

  // Tanda 2: lo que necesita el post ya resuelto. Las URLs van en una sola
  // llamada batch (media + portada juntas) en vez de una por archivo.
  const mediaPaths = media.map((m) => m.storage_path);
  const paths = p.cover_path ? [...mediaPaths, p.cover_path] : mediaPaths;
  const [{ data: cal }, { data: siblingRows }, signed] = await Promise.all([
    supabase.from("calendars").select("client_id, month, year").eq("id", p.calendar_id).single(),
    supabase
      .from("posts")
      .select("id, publish_date, position")
      .eq("calendar_id", p.calendar_id)
      .order("publish_date", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true }),
    signedUrls(supabase, paths),
  ]);

  const urls = signed.slice(0, media.length);
  const coverUrl = p.cover_path ? signed[media.length] ?? null : null;

  const siblings = (siblingRows as { id: string }[]) ?? [];
  const idx = siblings.findIndex((s) => s.id === postId);
  const prevId = idx > 0 ? siblings[idx - 1].id : null;
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  // Tanda 3: el nombre del cliente necesita el calendar.
  const { data: client } = await supabase
    .from("clients").select("name").eq("id", cal!.client_id).single();
  const backHref = `/agency/clientes/${cal!.client_id}?month=${cal!.month}&year=${cal!.year}`;

  // Historias del mismo día (para mostrar la secuencia junto al feed). Solo si
  // esta pieza no es una historia y tiene fecha.
  let dayStories: Post[] = [];
  let storyThumbs: Record<string, string | null> = {};
  if (p.tipo !== "historia" && p.publish_date) {
    const { data: st } = await supabase
      .from("posts").select("*")
      .eq("calendar_id", p.calendar_id).eq("tipo", "historia")
      .eq("publish_date", p.publish_date).order("position");
    dayStories = (st as Post[]) ?? [];
    storyThumbs = await computeThumbs(supabase, dayStories);
  }

  const comment = addAgencyComment.bind(null, postId);
  const changeFase = updateFase.bind(null, postId, cal!.client_id);
  // Sin esto, CommentThread no muestra el botón de borrar.
  const removeComment = profile.is_admin ? deleteComment.bind(null, postId) : undefined;

  return (
    <>
      <header className="md:sticky md:top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">{client?.name}</h1>
        <p className="text-sm text-muted-foreground">Detalle de pieza · {TIPO_LABEL[p.tipo]}</p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver a la cuenta
          </Link>
          <div className="flex items-center gap-3">
            {!editing && (
              <Link
                href={`/agency/piezas/${postId}?edit=1`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Pencil className="size-4" /> Editar pieza
              </Link>
            )}
            {!editing && siblings.length > 1 && (
              <div className="flex items-center gap-1">
                {idx >= 0 && (
                  <span className="mr-1 text-xs text-muted-foreground">
                    {idx + 1} de {siblings.length}
                  </span>
                )}
                <NavArrow href={prevId ? `/agency/piezas/${prevId}` : null} label="Pieza anterior">
                  <ChevronLeft className="size-5" />
                </NavArrow>
                <NavArrow href={nextId ? `/agency/piezas/${nextId}` : null} label="Pieza siguiente">
                  <ChevronRight className="size-5" />
                </NavArrow>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Editar pieza · {TIPO_LABEL[p.tipo]}</CardTitle></CardHeader>
            <CardContent className="p-5">
              <EditPostForm
                postId={postId}
                clientId={cal!.client_id}
                tipo={p.tipo}
                initialObjetivo={p.objetivo}
                initialObjetivoOtro={p.objetivo_otro ?? ""}
                initialCopy={p.copy ?? ""}
                initialPublishDate={p.publish_date?.slice(0, 10) ?? ""}
                initialDriveUrl={p.drive_url ?? ""}
                initialMedia={media.map((m, i) => ({
                  storagePath: m.storage_path,
                  mediaType: m.media_type,
                  url: urls[i] ?? "",
                }))}
                initialCoverPath={p.cover_path}
                initialCoverUrl={coverUrl}
                initialPreviewBg={p.preview_bg}
                initialPreviewText={p.preview_text ?? ""}
              />
            </CardContent>
          </Card>
        ) : (
        /* Media (izquierda) + copy/estado/comentarios (derecha) */
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
              {/* Con una sola media va a ancho completo: en 2 columnas fijas, una
                  historia o una placa suelta quedaban a media columna. */}
              {media.length ? (
                <div className={cn("grid gap-2", media.length > 1 && "grid-cols-2")}>
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
                !coverUrl &&
                (p.preview_bg ? (
                  // Placeholder de vista previa (color + texto) para el cliente.
                  <div className="aspect-[4/5] w-full max-w-sm">
                    <MediaThumb tipo={p.tipo} previewBg={p.preview_bg} previewText={p.preview_text} fill className="!relative" />
                  </div>
                ) : (
                  <div className="flex h-full min-h-40 items-center justify-center rounded-xl bg-secondary/50 text-sm text-muted-foreground">
                    Sin media subida (el archivo puede estar en Drive)
                  </div>
                ))
              )}
            </div>

            {/* Copy + estado + Drive + comentarios */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{TIPO_LABEL[p.tipo]}</Badge>
                  <Badge className="border-accent/30 bg-accent/10 text-accent">
                    {objetivoLabel(p)}
                  </Badge>
                </div>
                <StatusBadge estado={p.estado} />
              </div>
              {p.publish_date && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> Se publica el {formatPublishDate(p.publish_date)}
                </p>
              )}
              {p.copy ? (
                <div>
                  <p className="mb-1 text-sm font-medium">Copy</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.copy}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin copy.</p>
              )}
              {p.drive_url && (
                <a
                  href={p.drive_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-4" /> Ver archivo en Drive
                </a>
              )}

              {/* Fase de producción: la agencia la mueve; abajo el texto que ve el cliente */}
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium">Fase de producción</p>
                <FaseBar fase={p.fase} onChange={changeFase} />
              </div>

              {/* Comentarios en la misma columna, para aprovechar el alto */}
              <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium">Comentarios</p>
                <CommentThread comments={comments} participants={participants} deleteAction={removeComment} />
                <CommentComposer
                  action={comment}
                  participants={participants}
                  placeholder="Escribir un comentario... (usá @ para mencionar)"
                />
                <p className="text-xs text-muted-foreground">Escribí @ para mencionar a alguien.</p>
              </div>

              <div className="mt-auto flex justify-end border-t border-border pt-4">
                <DeletePostButton postId={p.id} clientId={cal!.client_id} redirectTo={backHref} />
              </div>
            </div>
          </CardContent>
          {dayStories.length > 0 && (
            <div className="border-t border-border p-5">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
                STORIES · SECUENCIA DEL DÍA
              </p>
              <StoriesStrip stories={dayStories} thumbs={storyThumbs} hrefBase="/agency/piezas/" />
            </div>
          )}
        </Card>
        )}
      </main>
    </>
  );
}
