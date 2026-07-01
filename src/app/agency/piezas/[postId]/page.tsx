import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/components/comment-thread";
import { DeletePostButton } from "../../clientes/[clientId]/delete-post-button";
import { TIPO_LABEL, type Comment, type Post, type PostMedia } from "@/lib/types";
import { formatPublishDate } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { addAgencyComment } from "./actions";

export default async function AgencyPiezaPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  await requireAgency();
  const { postId } = await params;
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

  const { data: mediaRows } = await supabase
    .from("post_media").select("*").eq("post_id", postId).order("position");
  const media = (mediaRows as PostMedia[]) ?? [];
  const urls = await Promise.all(media.map((m) => signedUrl(supabase, m.storage_path)));
  const coverUrl = p.cover_path ? await signedUrl(supabase, p.cover_path) : null;

  const { data: commentRows } = await supabase
    .from("comments").select("*").eq("post_id", postId).order("created_at");
  const comments = (commentRows as Comment[]) ?? [];

  const comment = addAgencyComment.bind(null, postId);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">{client?.name}</h1>
        <p className="text-sm text-muted-foreground">Detalle de pieza · {TIPO_LABEL[p.tipo]}</p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver al cliente
        </Link>

        {/* Media (izquierda) + copy/estado/comentarios (derecha) */}
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
                <CommentThread comments={comments} />
                <form action={comment} className="flex flex-col gap-2">
                  <textarea
                    name="comment" required rows={2}
                    placeholder="Escribir un comentario para el cliente..."
                    className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" variant="outline" size="sm" className="self-end">
                    Comentar
                  </Button>
                </form>
              </div>

              <div className="mt-auto flex justify-end border-t border-border pt-4">
                <DeletePostButton postId={p.id} clientId={cal!.client_id} />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
