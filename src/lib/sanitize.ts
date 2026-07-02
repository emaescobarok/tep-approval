// Sanitizador mínimo para el HTML enriquecido de la introducción.
// Permite solo un conjunto acotado de etiquetas de formato y, en los enlaces,
// solo el atributo href con esquemas seguros. Elimina scripts, estilos y
// atributos de eventos (on*) para evitar XSS.
const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "a",
]);

export function sanitizeIntroHtml(html: string): string {
  if (!html) return "";

  // Quitar bloques script/style completos.
  let out = html.replace(/<\/?(script|style)[^>]*>/gi, "");

  // Recorrer todas las etiquetas y filtrarlas.
  out = out.replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (match, slash, tagRaw, attrs) => {
    const tag = String(tagRaw).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (slash) return `</${tag}>`;

    if (tag === "a") {
      const hrefMatch = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const href = hrefMatch ? hrefMatch[2] ?? hrefMatch[3] ?? "" : "";
      const safe = /^(https?:|mailto:)/i.test(href) ? href : "";
      return safe
        ? `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">`
        : "<a>";
    }

    // Para el resto, descartar todos los atributos (incluidos on*).
    return `<${tag}>`;
  });

  return out;
}
