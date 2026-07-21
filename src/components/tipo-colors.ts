import type { PostTipo, PostFase } from "@/lib/types";

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

// Fondos para el placeholder de vista previa (piezas sin material todavía).
// La clave se guarda en posts.preview_bg. Cada valor lleva fondo + un color de
// texto legible sobre ese fondo, para que el texto de preview se lea siempre.
export const PREVIEW_BG: Record<string, { swatch: string; box: string }> = {
  claro:    { swatch: "bg-neutral-100", box: "bg-neutral-100 text-neutral-900" },
  oscuro:   { swatch: "bg-neutral-900", box: "bg-neutral-900 text-neutral-100" },
  lima:     { swatch: "bg-lime-300",    box: "bg-lime-300 text-neutral-900" },
  ambar:    { swatch: "bg-amber-300",   box: "bg-amber-300 text-neutral-900" },
  durazno:  { swatch: "bg-orange-300",  box: "bg-orange-300 text-neutral-900" },
  rosa:     { swatch: "bg-pink-300",    box: "bg-pink-300 text-neutral-900" },
  violeta:  { swatch: "bg-violet-400",  box: "bg-violet-400 text-white" },
  cielo:    { swatch: "bg-sky-300",     box: "bg-sky-300 text-neutral-900" },
  esmeralda:{ swatch: "bg-emerald-400", box: "bg-emerald-400 text-neutral-900" },
  vino:     { swatch: "bg-rose-700",    box: "bg-rose-700 text-white" },
};

export const PREVIEW_BG_KEYS = Object.keys(PREVIEW_BG);

// Color por fase de producción: avanza de neutro (borrador) a verde (publicado),
// pasando por el camino. Se usa para el texto y el subrayado de la fase activa.
export const FASE_COLOR: Record<PostFase, { text: string; border: string }> = {
  borrador:    { text: "text-neutral-300", border: "border-neutral-300" },
  revision:    { text: "text-sky-400",     border: "border-sky-400" },
  produccion:  { text: "text-violet-400",  border: "border-violet-400" },
  check_final: { text: "text-amber-400",   border: "border-amber-400" },
  programado:  { text: "text-lime-400",    border: "border-lime-400" },
  publicado:   { text: "text-emerald-400", border: "border-emerald-400" },
};

// Chip de fase: borde + fondo + texto tenues del color de la fase. Para los
// badges de fase en las cards (grilla, agenda, post-card).
export const FASE_CHIP: Record<PostFase, string> = {
  borrador:    "border-neutral-400/40 bg-neutral-400/10 text-neutral-200",
  revision:    "border-sky-400/40 bg-sky-400/10 text-sky-200",
  produccion:  "border-violet-400/40 bg-violet-400/10 text-violet-200",
  check_final: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  programado:  "border-lime-400/40 bg-lime-400/10 text-lime-200",
  publicado:   "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
};
