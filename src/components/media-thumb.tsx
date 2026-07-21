import Image from "next/image";
import { cn } from "@/lib/utils";
import { type PostPlataforma, type PostTipo, TIPO_LABEL } from "@/lib/types";
import { TIPO_GRADIENT, PREVIEW_BG } from "@/components/tipo-colors";
import { Image as ImageIcon, Film, LayoutGrid, Clock3, Type } from "lucide-react";

// Degradado por tipo — único lugar del UI con degradados (según el brief).
// Solo se ve cuando la pieza no tiene imagen. Los matices salen de TIPO_GRADIENT
// para que sean los mismos que los del calendario.

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
  previewBg,
  previewText,
  className,
  fill = false,
}: {
  // plataforma se acepta por compatibilidad pero ya no se usa para el color.
  plataforma?: PostPlataforma;
  tipo: PostTipo;
  url?: string | null;
  // Placeholder de vista previa: solo se usa cuando la pieza no tiene media.
  previewBg?: string | null;
  previewText?: string | null;
  className?: string;
  // fill: ocupa todo el contenedor (relative) en vez de imponer aspect-square.
  fill?: boolean;
}) {
  const Icon = tipoIcon[tipo];
  // Placeholder de preview: fondo de color elegido + texto, cuando no hay imagen.
  const preview = !url && previewBg ? PREVIEW_BG[previewBg] : undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl",
        fill ? "absolute inset-0 h-full w-full" : "aspect-square w-full",
        !url && (preview ? preview.box : `bg-gradient-to-br ${TIPO_GRADIENT[tipo]}`),
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
      ) : preview ? (
        previewText ? (
          <span className="line-clamp-6 px-2 text-center text-sm font-bold uppercase leading-tight tracking-tight [overflow-wrap:anywhere]">
            {previewText}
          </span>
        ) : (
          <Icon className="size-8 opacity-50" />
        )
      ) : (
        <Icon className="size-8 text-black/50" />
      )}
    </div>
  );
}
