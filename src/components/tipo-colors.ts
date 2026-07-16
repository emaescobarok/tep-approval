import type { PostTipo } from "@/lib/types";

// Un color por tipo de pieza, para distinguirlos de un vistazo (sobre todo en el
// calendario, donde solo se ve una línea de texto por pieza).
//
// Rompen a propósito con el lima del theme: si fueran todos de la familia
// amarilla no se distinguirían, que es justo lo que tienen que hacer. El lima
// queda para 'imagen' (la placa), que es el tipo más común.
export const TIPO_DOT: Record<PostTipo, string> = {
  carrusel: "bg-sky-400",
  imagen: "bg-lime-400",
  reel_video: "bg-violet-400",
  historia: "bg-amber-400",
  texto: "bg-neutral-400",
};

// Chip del calendario: borde y texto tenues del mismo color que el punto.
export const TIPO_CHIP: Record<PostTipo, string> = {
  carrusel: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  imagen: "border-lime-400/40 bg-lime-400/10 text-lime-200",
  reel_video: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  historia: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  texto: "border-neutral-400/40 bg-neutral-400/10 text-neutral-200",
};

// Degradado de la miniatura cuando la pieza no tiene imagen. Mismos matices que
// el punto, para que el lenguaje de color sea uno solo en toda la app.
export const TIPO_GRADIENT: Record<PostTipo, string> = {
  carrusel: "from-sky-400 to-cyan-600",
  imagen: "from-lime-300 to-lime-600",
  reel_video: "from-violet-400 to-fuchsia-600",
  historia: "from-amber-300 to-orange-500",
  texto: "from-neutral-400 to-neutral-600",
};
