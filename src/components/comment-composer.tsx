"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionText } from "@/components/mention-text";
import type { Participant } from "@/lib/mentions";

// El textarea y la capa de resaltado tienen que dibujar el texto EXACTAMENTE en
// el mismo lugar, así que comparten tipografía, padding y borde. Si tocás uno,
// tocá el otro o el texto empieza a bailar.
const TEXT_BOX = "w-full rounded-lg border px-3 py-2 text-sm leading-normal";

// Caja de comentario con autocompletado de menciones (@usuario).
// El servidor recalcula las menciones a partir del texto: acá solo ayudamos
// a escribirlas. `action` es la Server Action ya atada al postId.
export function CommentComposer({
  action,
  participants,
  placeholder = "Escribir un comentario...",
  submitLabel = "Comentar",
}: {
  action: (formData: FormData) => Promise<void>;
  participants: Participant[];
  placeholder?: string;
  submitLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const labels = participants.map((p) => p.label);

  const matches = open
    ? participants
        .filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : [];

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    const caret = e.target.selectionStart ?? v.length;
    const m = v.slice(0, caret).match(/@([^\s@]*)$/);
    if (m) {
      setQuery(m[1]);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function pick(p: Participant) {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([^\s@]*)$/, `@${p.label} `);
    const after = value.slice(caret);
    const next = before + after;
    setValue(next);
    setOpen(false);
    // Reposiciona el cursor después de la mención insertada.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setValue("");
        setOpen(false);
      }}
      className="relative flex flex-col gap-2"
    >
      <div className="relative">
        {/* Capa de resaltado: dibuja el texto con las menciones pintadas. Un
            textarea no puede estilar partes de su contenido, así que el de arriba
            va con el texto transparente y solo aporta el cursor y la edición. */}
        <div
          ref={backdropRef}
          aria-hidden
          className={cn(
            TEXT_BOX,
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border-transparent bg-card text-foreground"
          )}
        >
          {/* font-normal a propósito: la negrita ensancha el texto y lo
              desalinearía del cursor del textarea, que no la tiene. */}
          <MentionText text={value} labels={labels} className="font-normal" />
          {/* El textarea deja una línea de más al terminar en \n; esto la iguala. */}
          {value.endsWith("\n") && " "}
        </div>

        <textarea
          ref={ref}
          name="comment"
          required
          rows={2}
          value={value}
          onChange={onChange}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          onScroll={(e) => {
            if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          placeholder={placeholder}
          className={cn(
            TEXT_BOX,
            "relative resize-none border-input bg-transparent text-transparent caret-foreground outline-none",
            "placeholder:text-muted-foreground selection:bg-primary/30 focus:ring-2 focus:ring-ring"
          )}
        />

        {open && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <span className="truncate">{p.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      p.role === "agency"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {p.role === "agency" ? "agencia" : "cliente"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button type="submit" variant="outline" size="sm" className="self-end">
        {submitLabel}
      </Button>
    </form>
  );
}
