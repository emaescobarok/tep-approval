import { cn } from "@/lib/utils";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parte un texto en tramos, marcando cuáles son una mención "@etiqueta".
// Las etiquetas largas van primero para que "@Ana" no coma a "@Ana María".
export function splitMentions(text: string, labels: string[]): { part: string; hit: boolean }[] {
  const tokens = labels.map((l) => "@" + l).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return [{ part: text, hit: false }];

  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "g");
  return text.split(re).map((part) => ({ part, hit: tokens.includes(part) }));
}

// Render con las menciones resaltadas. Lo comparten el hilo de comentarios y la
// capa de resaltado del composer, para que se vean igual mientras escribís y
// después de enviar.
export function MentionText({
  text,
  labels,
  className,
}: {
  text: string;
  labels: string[];
  className?: string;
}) {
  return (
    <>
      {splitMentions(text, labels).map(({ part, hit }, i) =>
        hit ? (
          <span
            key={i}
            className={cn("rounded bg-primary/20 font-semibold text-primary", className)}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
