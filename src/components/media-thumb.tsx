import Image from "next/image";
import { cn } from "@/lib/utils";
import { type PostPlataforma, type PostTipo, TIPO_LABEL } from "@/lib/types";
import { Image as ImageIcon, Film, LayoutGrid, Clock3, Type } from "lucide-react";

// Degradado por tipo — único lugar del UI con degradados (según el brief).
// Solo se ve cuando la pieza no tiene imagen. Todos dentro de la familia
// lima/amarillo para no romper la identidad; se distinguen por matiz.
const gradients: Record<PostTipo, string> = {
  carrusel: "from-lime-300 via-lime-500 to-emerald-600",
  imagen: "from-lime-200 to-lime-500",
  reel_video: "from-yellow-300 via-lime-400 to-teal-600",
  historia: "from-amber-300 to-yellow-500",
  texto: "from-neutral-400 to-neutral-600",
};

const tipoIcon: Record<PostTipo, React.ComponentType<{ className?: string }>> = {
  carrusel: LayoutGrid,
  imagen: ImageIcon,
  reel_video: Film,
  historia: Clock3,
  texto: Type,
};

export function MediaThumb({
  tipo,
  url,
  className,
  fill = false,
}: {
  // plataforma se acepta por compatibilidad pero ya no se usa para el color.
  plataforma?: PostPlataforma;
  tipo: PostTipo;
  url?: string | null;
  className?: string;
  // fill: ocupa todo el contenedor (relative) en vez de imponer aspect-square.
  fill?: boolean;
}) {
  const Icon = tipoIcon[tipo];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl",
        fill ? "absolute inset-0 h-full w-full" : "aspect-square w-full",
        !url && `bg-gradient-to-br ${gradients[tipo]}`,
        className
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={TIPO_LABEL[tipo]}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          className="object-cover"
        />
      ) : (
        <Icon className="size-8 text-black/50" />
      )}
    </div>
  );
}
