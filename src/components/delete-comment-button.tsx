"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Trash2 } from "lucide-react";

// Borrar un comentario. Solo lo renderiza CommentThread cuando le pasan la
// acción, y eso solo pasa si el usuario es admin.
export function DeleteCommentButton({
  commentId,
  author,
  action,
}: {
  commentId: string;
  author: string;
  action: (commentId: string) => Promise<void>;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="¿Eliminar este comentario?"
      message={`Se borra el comentario de ${author}. No se puede deshacer.`}
      confirmLabel="Sí, eliminar"
      cancelLabel="No"
      triggerTitle="Eliminar comentario"
      // Aparece al pasar el mouse por el comentario: son muchos y un tacho fijo
      // en cada uno es ruido.
      triggerClassName="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/comment:opacity-100"
      trigger={<Trash2 className="size-3.5" />}
      onConfirm={async () => {
        await action(commentId);
        router.refresh();
      }}
    />
  );
}
