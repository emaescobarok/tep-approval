import { cn } from "@/lib/utils";
import { type PostPlataforma, type PostTipo, TIPO_LABEL } from "@/lib/types";
import { Image as ImageIcon, Film, LayoutGrid, Clock3, Type } from "lucide-react";

// Degradado por tipo — único lugar del UI con degradados (según el brief).
const gradients: Record<PostTipo, string> = {
  carrusel: "from-primary via-accent to-chart-3",
  imagen: "from-emerald-500 to-teal-400",
  reel_video: "from-violet-600 via-fuchsia-500 to-rose-400",
  historia: "from-amber-500 to-orange-400",
  texto: "from-sky-600 to-cyan-400",
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={TIPO_LABEL[tipo]} className="h-full w-full object-cover" />
      ) : (
        <Icon className="size-8 text-white/90" />
      )}
    </div>
  );
}
