import type { Comment } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function CommentThread({ comments }: { comments: Comment[] }) {
  if (!comments.length) {
    return <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {comments.map((c) => {
        const isAgency = c.author_role === "agency";
        return (
          <li key={c.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs font-medium " +
                  (isAgency ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground")
                }
              >
                {isAgency ? "tep agency" : "Cliente"}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-secondary/60 px-3 py-2 text-sm">
              {c.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
