"use client";

import { useRouter } from "next/navigation";
import { deletePost } from "./actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

// `redirectTo`: a dónde ir después de borrar. Es obligatorio cuando el botón vive
// en una página que depende de la pieza (el detalle): ahí un refresh dejaría la
// vista parada en una URL que ya no existe -> 404. En el listado se omite y refresca.
export function DeletePostButton({
  postId,
  clientId,
  redirectTo,
}: {
  postId: string;
  clientId: string;
  redirectTo?: string;
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
        const res = await deletePost(postId, clientId);
        if (!res.ok) return;
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
