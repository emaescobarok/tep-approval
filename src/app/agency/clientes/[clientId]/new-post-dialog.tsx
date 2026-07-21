"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPostForm } from "./new-post-form";

// Botón "Crear pieza" que abre el formulario en un modal, en vez de tenerlo
// siempre fijo en la barra lateral. Mismo patrón de overlay que FeedLightbox.
export function NewPostDialog({
  clientId,
  month,
  year,
}: {
  clientId: string;
  month: number;
  year: number;
}) {
  const [open, setOpen] = useState(false);

  // Escape cierra; se bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Crear pieza
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/80 p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nueva pieza"
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Nueva pieza</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Cerrar"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="p-5">
              <NewPostForm
                clientId={clientId}
                month={month}
                year={year}
                onCreated={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
