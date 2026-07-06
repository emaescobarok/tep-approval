import type { Comment } from "@/lib/types";
import type { Participant } from "@/lib/mentions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resalta los "@etiqueta" de los usuarios mencionados en el comentario.
function renderBody(body: string, mentionLabels: string[]) {
  if (mentionLabels.length === 0) return body;
  const tokens = mentionLabels
    .map((l) => "@" + l)
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "g");
  return body.split(re).map((part, i) =>
    tokens.includes(part) ? (
      <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CommentThread({
  comments,
  participants = [],
}: {
  comments: Comment[];
  participants?: Participant[];
}) {
  if (!comments.length) {
    return <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>;
  }

  const labelById = new Map(participants.map((p) => [p.id, p.label]));

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((c) => {
        const isAgency = c.author_role === "agency";
        const authorName =
          (c.author_id && labelById.get(c.author_id)) ||
          (isAgency ? "tep agency" : "Cliente");
        const mentionLabels = (c.mentions ?? [])
          .map((id) => labelById.get(id))
          .filter((l): l is string => !!l);

        return (
          <li key={c.id} className="flex flex-col gap-1">
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
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-secondary/60 px-3 py-2 text-sm">
              {renderBody(c.body, mentionLabels)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
