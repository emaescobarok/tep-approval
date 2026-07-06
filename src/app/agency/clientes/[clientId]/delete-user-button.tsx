"use client";

import { useRouter } from "next/navigation";
import { deleteClientUser } from "./actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

export function DeleteUserButton({
  clientId,
  userId,
  userName,
}: {
  clientId: string;
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="¿Eliminar este usuario?"
      message={`Se eliminará el acceso de ${userName} a esta cuenta. Esta acción no se puede deshacer.`}
      confirmLabel="Sí, eliminar"
      cancelLabel="No"
      triggerTitle="Eliminar usuario"
      triggerClassName="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
      trigger={<Trash2 className="size-3.5" />}
      onConfirm={async () => {
        await deleteClientUser(clientId, userId);
        router.refresh();
      }}
    />
  );
}
