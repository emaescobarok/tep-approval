"use client";

import { cn } from "@/lib/utils";
import { PREVIEW_BG, PREVIEW_BG_KEYS } from "@/components/tipo-colors";

export const PREVIEW_TEXT_MAX = 60;

// Placeholder de vista previa para piezas sin material todavía: un color de fondo
// + un texto corto. Solo se muestra al cliente cuando la pieza no tiene media.
export function PreviewPicker({
  bg,
  onBgChange,
  text,
  onTextChange,
}: {
  bg: string | null;
  onBgChange: (v: string | null) => void;
  text: string;
  onTextChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de fondo">
        {PREVIEW_BG_KEYS.map((key) => {
          const active = bg === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              title={key}
              // Volver a clickear el color activo lo deselecciona (sin fondo custom).
              onClick={() => onBgChange(active ? null : key)}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition-all",
                PREVIEW_BG[key].swatch,
                active ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-foreground/40"
              )}
            />
          );
        })}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(e.target.value.slice(0, PREVIEW_TEXT_MAX))}
        maxLength={PREVIEW_TEXT_MAX}
        placeholder="Texto de la vista previa (ej: VIERNES DE SORTEO)"
        aria-label="Texto de vista previa"
        className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
