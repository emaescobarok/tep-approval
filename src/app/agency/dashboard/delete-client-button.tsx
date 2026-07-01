"use client";

import { useRouter } from "next/navigation";
import { deleteClientAction } from "./actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  return (
    <div className="absolute right-3 top-3 z-10">
      <ConfirmButton
        title={`¿Eliminar a ${clientName}?`}
        message="Se borrarán todos sus calendarios, piezas y comentarios. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="No"
        triggerTitle={`Eliminar ${clientName}`}
        triggerClassName="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        trigger={<Trash2 className="size-4" />}
        onConfirm={async () => {
          await deleteClientAction(clientId);
          router.refresh();
        }}
      />
    </div>
  );
}
