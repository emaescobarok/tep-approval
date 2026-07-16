import DOMPurify from "isomorphic-dompurify";

// Sanitizador del HTML enriquecido de la introducción.
//
// Antes esto era un parser a base de regex y se podía escapar: si el href venía
// entre comillas SIMPLES, el valor capturado podía contener una comilla doble, y
// al interpolarlo en href="..." cerraba el atributo antes de tiempo.
//
//   <a href='https://x.com" onfocus="alert(1)" autofocus="'>
//
// Pasaba el chequeo de esquema (empieza con https://) y salía con un onfocus
// intacto, que además dispara solo por el autofocus. Parsear HTML con regex
// siempre termina así: DOMPurify arma el DOM de verdad y decide sobre el árbol,
// no sobre el texto.
//
// La política es la misma de antes: formato básico y, en los links, solo href
// con esquemas seguros.

const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "br",
  "p", "div", "span",
  "ul", "ol", "li",
  "a",
];

// Solo http(s) y mailto, igual que la versión anterior.
const ALLOWED_URI_REGEXP = /^(?:https?|mailto):/i;

// Los links de la intro van siempre a pestaña nueva y sin filtrar el referrer.
// Va en un hook, sobre el nodo ya parseado, en vez de concatenar strings: la
// concatenación era justamente el bug.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.nodeName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
});

export function sanitizeIntroHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP,
  });
}
