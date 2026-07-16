import type { Comment } from "@/lib/types";
import type { Participant } from "@/lib/mentions";
import { MentionText } from "@/components/mention-text";
import { DeleteCommentButton } from "@/components/delete-comment-button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// El resaltado se resuelve contra los participantes y no contra la columna
// `mentions`: esa se guarda al crear el comentario (la usan las notificaciones),
// así que un comentario viejo o guardado sin ella quedaba sin resaltar.
export function CommentThread({
  comments,
  participants = [],
  deleteAction,
}: {
  comments: Comment[];
  participants?: Participant[];
  // Solo la pasa la vista de agencia cuando el usuario es admin. Sin esto no se
  // muestra el botón de borrar.
  deleteAction?: (commentId: string) => Promise<void>;
}) {
  if (!comments.length) {
    return <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>;
  }

  const labelById = new Map(participants.map((p) => [p.id, p.label]));
  const allLabels = participants.map((p) => p.label);

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((c) => {
        const isAgency = c.author_role === "agency";
        const authorName =
          (c.author_id && labelById.get(c.author_id)) ||
          (isAgency ? "tep agency" : "Cliente");
        return (
          <li key={c.id} className="group/comment flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs font-medium " +
                  (isAgency ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground")
                }
              >
                {authorName}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
              {deleteAction && (
                <DeleteCommentButton
                  commentId={c.id}
                  author={authorName}
                  action={deleteAction}
                />
              )}
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-secondary/60 px-3 py-2 text-sm">
              <MentionText text={c.body} labels={allLabels} className="px-1 py-0.5" />
            </p>
          </li>
        );
      })}
    </ul>
  );
}
