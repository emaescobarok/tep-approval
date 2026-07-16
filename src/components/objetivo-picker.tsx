"use client";

import { Sparkles, Package, Star, Percent, HelpCircle, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { OBJETIVOS, OBJETIVO_LABEL, type PostObjetivo } from "@/lib/types";

// Los íconos viven acá y no en lib/types.ts: types.ts es dominio puro y lo
// importan server components, no debería arrastrar componentes de lucide.
const OBJETIVO_ICON: Record<PostObjetivo, typeof Sparkles> = {
  marca: Sparkles,
  productos: Package,
  resenas: Star,
  promos: Percent,
  faq: HelpCircle,
  otro: PenLine,
};

export const OBJETIVO_OTRO_MAX = 40;

// Selector de objetivo: círculos con ícono. Con 'otro' se despliega un texto libre.
// El objetivo es opcional, así que volver a tocar el elegido lo deselecciona.
export function ObjetivoPicker({
  value,
  onChange,
  otro,
  onOtroChange,
}: {
  value: PostObjetivo | "";
  onChange: (v: PostObjetivo | "") => void;
  otro: string;
  onOtroChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Objetivo" className="flex flex-wrap gap-2">
        {OBJETIVOS.map((o) => {
          const Icon = OBJETIVO_ICON[o];
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={active}
              title={active ? "Tocá de nuevo para quitar el objetivo" : OBJETIVO_LABEL[o]}
              onClick={() => {
                // Al cambiar de objetivo el texto libre deja de aplicar (la DB
                // exige objetivo_otro null cuando el objetivo no es 'otro').
                if (o !== "otro") onOtroChange("");
                onChange(active ? "" : o);
              }}
              className="flex w-16 flex-col items-center gap-1.5 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border-2 transition-colors",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight transition-colors",
                  active ? "font-medium text-accent" : "text-muted-foreground"
                )}
              >
                {OBJETIVO_LABEL[o]}
              </span>
            </button>
          );
        })}
      </div>

      {value === "otro" && (
        <div className="flex flex-col gap-1 animate-fade-in">
          <input
            type="text"
            autoFocus
            value={otro}
            onChange={(e) => onOtroChange(e.target.value.slice(0, OBJETIVO_OTRO_MAX))}
            maxLength={OBJETIVO_OTRO_MAX}
            placeholder="¿Cuál es el objetivo? Ej: Sorteo, Evento..."
            aria-label="Objetivo personalizado"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {otro.length}/{OBJETIVO_OTRO_MAX}
          </p>
        </div>
      )}
    </div>
  );
}
