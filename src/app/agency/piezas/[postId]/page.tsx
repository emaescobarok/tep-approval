import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Pencil } from "lucide-react";
import { NavArrow } from "@/components/nav-arrow";
import { EditPostForm } from "./edit-post-form";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/components/comment-thread";
import { CommentComposer } from "@/components/comment-composer";
import { getPostParticipants } from "@/lib/mentions";
import { DeletePostButton } from "../../clientes/[clientId]/delete-post-button";
import { TIPO_LABEL, type Comment, type Post, type PostMedia } from "@/lib/types";
import { formatPublishDate } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { addAgencyComment } from "./actions";

export default async function AgencyPiezaPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAgency();
  const { postId } = await params;
  const { edit } = await searchParams;
  const editing = edit === "1";
  const supabase = await createClient();

  const { data: post } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  if (!post) notFound(); // RLS: si no tiene acceso, no lo ve

  const p = post as Post;

  // Cliente (para el link de vuelta) vía calendar
  const { data: cal } = await supabase
    .from("calendars").select("client_id, month, year").eq("id", p.calendar_id).single();
  const { data: client } = await supabase
    .from("clients").select("name").eq("id", cal!.client_id).single();
  const backHref = `/agency/clientes/${cal!.client_id}?month=${cal!.month}&year=${cal!.year}`;

  // Piezas vecinas del mismo calendario, ordenadas por fecha (menor a mayor).
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

  const comment = addAgencyComment.bind(null, postId);

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
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-muted"
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
                    Sin media subida (el archivo puede estar en Drive)
                  </div>
                )
              )}
            </div>

            {/* Copy + estado + Drive + comentarios */}
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

              {/* Comentarios en la misma columna, para aprovechar el alto */}
              <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium">Comentarios</p>
                <CommentThread comments={comments} participants={participants} />
                <CommentComposer
                  action={comment}
                  participants={participants}
                  placeholder="Escribir un comentario... (usá @ para mencionar)"
                />
                <p className="text-xs text-muted-foreground">Escribí @ para mencionar a alguien.</p>
              </div>

              <div className="mt-auto flex justify-end border-t border-border pt-4">
                <DeletePostButton postId={p.id} clientId={cal!.client_id} />
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </main>
    </>
  );
}
