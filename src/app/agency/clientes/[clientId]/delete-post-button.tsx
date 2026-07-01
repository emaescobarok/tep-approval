"use client";

import { useRouter } from "next/navigation";
import { deletePost } from "./actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

export function DeletePostButton({
  postId,
  clientId,
}: {
  postId: string;
  clientId: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="¿Eliminar esta pieza?"
      message="Se borrará la publicación y su contenido. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      cancelLabel="No"
      triggerTitle="Eliminar pieza"
      triggerClassName="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
      trigger={<Trash2 className="size-4" />}
      onConfirm={async () => {
        await deletePost(postId, clientId);
        router.refresh();
      }}
    />
  );
}
