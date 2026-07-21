import type { Post } from "@/lib/types";

// Una "tarjeta" de la grilla: la pieza protagonista del día (una placa/reel/
// carrusel) y las historias de esa misma fecha, que se muestran pegadas a ella
// en vez de como tarjetas sueltas.
export type PiezaConHistorias = { card: Post; stories: Post[] };

const SIN_FECHA = "sin-fecha";

function fechaKey(p: Post): string {
  return p.publish_date?.slice(0, 10) ?? SIN_FECHA;
}

// Arma las tarjetas de la grilla agrupando las historias en su día:
//  - Cada pieza de feed (no-historia) es una tarjeta. Las historias de esa fecha
//    se cuelgan de la PRIMERA pieza de feed del día (para no repetir la tira).
//  - Un día que solo tiene historias igual aparece: la primera historia hace de
//    tarjeta y el resto va en su tira. Así ninguna pieza se pierde.
// Respeta el orden de entrada (los posts ya vienen ordenados por position).
export function agruparParaGrilla(posts: Post[]): PiezaConHistorias[] {
  const storiesPorDia = new Map<string, Post[]>();
  for (const p of posts) {
    if (p.tipo !== "historia") continue;
    const key = fechaKey(p);
    storiesPorDia.set(key, [...(storiesPorDia.get(key) ?? []), p]);
  }

  const result: PiezaConHistorias[] = [];
  const diaConFeed = new Set<string>();
  const feedYaUsoTira = new Set<string>();

  for (const p of posts) {
    if (p.tipo === "historia") continue;
    const key = fechaKey(p);
    diaConFeed.add(key);
    // Solo la primera pieza de feed del día se lleva la tira de historias.
    const stories = feedYaUsoTira.has(key) ? [] : storiesPorDia.get(key) ?? [];
    feedYaUsoTira.add(key);
    result.push({ card: p, stories });
  }

  // Días con historias pero sin ninguna pieza de feed: no se pueden perder.
  for (const [key, stories] of storiesPorDia) {
    if (diaConFeed.has(key)) continue;
    result.push({ card: stories[0], stories: stories.slice(1) });
  }

  return result;
}
