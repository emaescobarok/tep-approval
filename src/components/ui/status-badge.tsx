import { cn } from "@/lib/utils";
import { ESTADO_LABEL, type PostEstado } from "@/lib/types";

// Badges de estado: pendiente = gris, aprobado = lima (primary), cambios_pedidos
// = ámbar (warning). Sobre el theme oscuro el texto va en el color vivo, no en
// el *-foreground: ese está pensado para ir ARRIBA del color, no al lado.
const styles: Record<PostEstado, string> = {
  pendiente: "bg-muted text-muted-foreground",
  aprobado: "bg-primary/15 text-primary",
  cambios_pedidos: "bg-warning/15 text-warning",
};

const dot: Record<PostEstado, string> = {
  pendiente: "bg-muted-foreground",
  aprobado: "bg-primary",
  cambios_pedidos: "bg-warning",
};

export function StatusBadge({
  estado,
  className,
}: {
  estado: PostEstado;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[estado],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[estado])} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
