"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { MediaTipo, PostTipo } from "@/lib/types";
import { Play, LayoutGrid, X, ChevronLeft, ChevronRight, Maximize2, ImageOff } from "lucide-react";

// Los datos ya vienen resueltos del server (URLs firmadas, label del objetivo):
// este componente es solo presentación y no vuelve a pegarle a Supabase.
export type FeedItem = {
  id: string;
  tipo: PostTipo;
  copy: string | null;
  objetivo: string;
  fecha: string | null;
  thumb: string | null;
  media: { url: string; mediaType: MediaTipo }[];
};

export function FeedLightbox({ items }: { items: FeedItem[] }) {
  const [open, setOpen] = useState(false);
  // null = mostrando la grilla; número = pieza abierta.
  const [idx, setIdx] = useState<number | null>(null);
  const [img, setImg] = useState(0);

  const item = idx === null ? null : items[idx];
  const total = item?.media.length ?? 0;

  // Al cambiar de pieza siempre se arranca por su primera imagen.
  const irPieza = useCallback(
    (delta: number) => {
      setIdx((prev) => {
        if (prev === null) return prev;
        const next = prev + delta;
        if (next < 0 || next >= items.length) return prev;
        setImg(0);
        return next;
      });
    },
    [items.length]
  );

  const cerrar = useCallback(() => {
    setOpen(false);
    setIdx(null);
  }, []);

  // Teclado: Escape cierra (primero la pieza, después la tarjeta) y las flechas
  // mueven entre piezas.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (idx !== null) setIdx(null);
        else cerrar();
      }
      if (idx === null) return;
      if (e.key === "ArrowRight") irPieza(1);
      if (e.key === "ArrowLeft") irPieza(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, idx, irPieza, cerrar]);

  // El scroll del fondo detrás de la tarjeta distrae.
  useEffect(() => {
    if (!open) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [open]);

  if (items.length === 0) return null;

  const titulo =
    idx !== null
      ? `${idx + 1} de ${items.length}`
      : `Vista previa del feed · ${items.length} ${items.length === 1 ? "pieza" : "piezas"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
      >
        <Maximize2 className="size-4" /> Ampliar
      </button>

      {open && (
        // Scrim opaco y sin blur: el desenfoque dejaba ver la página de atrás
        // hecha una mancha. Clic afuera cierra.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 animate-fade-in"
          onClick={cerrar}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vista previa del feed"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                {idx !== null && (
                  <button
                    type="button"
                    onClick={() => setIdx(null)}
                    className="-ml-1 flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" /> Volver
                  </button>
                )}
                <h2 className="text-sm font-semibold">{titulo}</h2>
              </div>
              <button
                type="button"
                onClick={cerrar}
                title="Cerrar"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </header>

            {idx === null ? (
              /* Grilla estilo perfil de Instagram */
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl bg-border/40">
                  {items.map((it, i) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        setIdx(i);
                        setImg(0);
                      }}
                      className="group relative aspect-[4/5] overflow-hidden bg-secondary"
                    >
                      {it.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.thumb}
                          alt={it.objetivo}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <ImageOff className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                      <span className="absolute inset-0 transition-colors group-hover:bg-black/20" />
                      {it.tipo === "reel_video" && (
                        <Play className="absolute right-2 top-2 size-4 fill-white text-white drop-shadow-md" />
                      )}
                      {it.tipo === "carrusel" && (
                        <LayoutGrid className="absolute right-2 top-2 size-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Pieza abierta: media arriba/izquierda + info al costado */
              <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="relative flex min-h-0 items-center justify-center bg-neutral-900">
                  {total === 0 ? (
                    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 text-white/40">
                      <ImageOff className="size-6" />
                      <p className="text-sm">Sin media</p>
                    </div>
                  ) : item!.media[img].mediaType === "video" ? (
                    <video src={item!.media[img].url} controls className="max-h-[60vh] w-full object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item!.media[img].url}
                      alt={item!.objetivo}
                      className="max-h-[60vh] w-full object-contain"
                    />
                  )}

                  {/* Flechas entre piezas */}
                  <NavBtn side="left" disabled={idx === 0} onClick={() => irPieza(-1)} title="Pieza anterior" />
                  <NavBtn
                    side="right"
                    disabled={idx === items.length - 1}
                    onClick={() => irPieza(1)}
                    title="Pieza siguiente"
                  />

                  {/* Carrusel: contador y puntitos */}
                  {total > 1 && (
                    <>
                      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                        {img + 1}/{total}
                      </span>
                      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                        {item!.media.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setImg(i)}
                            title={`Imagen ${i + 1}`}
                            className={cn(
                              "size-1.5 rounded-full transition-colors",
                              i === img ? "bg-white" : "bg-white/40 hover:bg-white/70"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t border-border p-4 md:border-l md:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      {item!.objetivo}
                    </span>
                    {item!.fecha && <span className="text-xs text-muted-foreground">{item!.fecha}</span>}
                  </div>
                  {item!.copy ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{item!.copy}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Sin copy.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Flechas para moverse entre piezas. Las imágenes de un carrusel se pasan con
// los puntitos de abajo, para no tener dos pares de flechas peleando por el mismo lugar.
function NavBtn({
  side,
  onClick,
  disabled,
  title,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
