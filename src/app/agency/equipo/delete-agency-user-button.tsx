"use client";

import { useRouter } from "next/navigation";
import { deleteAgencyUser } from "./actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

export function DeleteAgencyUserButton({
  agencyId,
  userName,
}: {
  agencyId: string;
  userName: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="¿Eliminar este miembro?"
      message={`Se eliminará el acceso de ${userName} al equipo. Esta acción no se puede deshacer.`}
      confirmLabel="Sí, eliminar"
      cancelLabel="No"
      triggerTitle="Eliminar miembro"
      triggerClassName="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
      trigger={<Trash2 className="size-4" />}
      onConfirm={async () => {
        await deleteAgencyUser(agencyId);
        router.refresh();
      }}
    />
  );
}
