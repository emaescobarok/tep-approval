"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { FASES, FASE_LABEL, FASE_TEXTO, type PostFase } from "@/lib/types";
import { FASE_COLOR } from "@/components/tipo-colors";

// Barra de fases de producción. Dos usos:
//  - Agencia: interactiva. Al clickear una fase llama a `onChange` (server action)
//    y muestra el texto de esa fase. Optimista: resalta al toque, no espera al server.
//  - Cliente: readOnly. Solo resalta la fase actual y muestra su texto.
export function FaseBar({
  fase,
  onChange,
  readOnly = false,
}: {
  fase: PostFase;
  onChange?: (fase: PostFase) => Promise<{ ok: boolean; error?: string }>;
  readOnly?: boolean;
}) {
  const [current, setCurrent] = useState<PostFase>(fase);
  const [pending, startTransition] = useTransition();

  function select(f: PostFase) {
    if (readOnly || !onChange || f === current) return;
    const prev = current;
    setCurrent(f); // optimista
    startTransition(async () => {
      const res = await onChange(f);
      if (!res.ok) setCurrent(prev); // revierte si el server rechaza
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role={readOnly ? undefined : "radiogroup"}
        aria-label="Fase de la pieza"
        className={cn(
          "flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-2",
          pending && "opacity-70"
        )}
      >
        {FASES.map((f) => {
          const active = current === f;
          const color = FASE_COLOR[f];
          return (
            <button
              key={f}
              type="button"
              role={readOnly ? undefined : "radio"}
              aria-checked={readOnly ? undefined : active}
              disabled={readOnly || pending}
              onClick={() => select(f)}
              className={cn(
                "-mb-2 border-b-2 pb-2 text-xs font-medium transition-colors outline-none",
                readOnly ? "cursor-default" : "cursor-pointer",
                active
                  ? `${color.border} ${color.text}`
                  : "border-transparent text-muted-foreground/60"
                    + (readOnly ? "" : " hover:text-foreground")
              )}
            >
              {FASE_LABEL[f]}
            </button>
          );
        })}
      </div>
      <p className={cn("text-sm italic", FASE_COLOR[current].text)}>{FASE_TEXTO[current]}</p>
    </div>
  );
}
