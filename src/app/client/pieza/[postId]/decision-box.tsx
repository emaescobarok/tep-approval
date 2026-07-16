"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PostEstado } from "@/lib/types";
import { Check, MessageSquareWarning } from "lucide-react";

// Aprobar / pedir cambios. Es cliente por el textarea, que aparece recién al
// pedir cambios: tenerlo siempre abierto empujaba los comentarios fuera de vista
// y le daba más peso visual a corregir que a aprobar.
export function DecisionBox({
  estado,
  approve,
  requestChanges,
}: {
  estado: PostEstado;
  approve: () => Promise<void>;
  requestChanges: (formData: FormData) => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  const aprobada = estado === "aprobado";

  if (asking) {
    return (
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label htmlFor="comment" className="text-sm font-medium">
          ¿Qué querés ajustar?
        </label>
        <form action={requestChanges} className="flex flex-col gap-2">
          <textarea
            id="comment"
            name="comment"
            required
            rows={3}
            autoFocus
            placeholder="Contanos qué querés ajustar..."
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="warning" className="flex-1">
              Enviar corrección
            </Button>
            <Button type="button" variant="outline" onClick={() => setAsking(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className={aprobada ? "" : "grid grid-cols-2 gap-2"}>
        {!aprobada && (
          <form action={approve}>
            <Button type="submit" className="w-full">
              <Check className="size-4" /> Aprobar
            </Button>
          </form>
        )}
        <Button
          type="button"
          variant="outline"
          className={aprobada ? "w-full" : ""}
          onClick={() => setAsking(true)}
        >
          <MessageSquareWarning className="size-4" /> Pedir cambios
        </Button>
      </div>
    </div>
  );
}
