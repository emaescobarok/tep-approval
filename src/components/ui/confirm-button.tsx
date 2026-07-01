"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Botón que abre un modal de confirmación Sí/No antes de ejecutar onConfirm.
export function ConfirmButton({
  onConfirm,
  title,
  message,
  confirmLabel = "Sí, eliminar",
  cancelLabel = "No",
  trigger,
  triggerClassName,
  triggerTitle,
}: {
  onConfirm: () => Promise<void> | void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={triggerClassName}
        title={triggerTitle}
      >
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (!pending) setOpen(false);
          }}
        >
          <div
            className={cn(
              "w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg animate-fade-in"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{title}</h3>
            {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirm}
                disabled={pending}
              >
                {pending ? "Eliminando..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
