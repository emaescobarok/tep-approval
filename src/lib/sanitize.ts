import sanitizeHtml from "sanitize-html";

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
// siempre termina así: sanitize-html arma el árbol de verdad y decide sobre el
// DOM, no sobre el texto.
//
// Se usa sanitize-html (JS puro, htmlparser2) en vez de isomorphic-dompurify:
// este último arrastra jsdom, que rompía en el runtime de Vercel al bundlearse
// (ERR_REQUIRE_ESM). sanitize-html corre igual en server y en browser.
//
// La política es la misma de antes: formato básico y, en los links, solo href
// con esquemas seguros (http/https/mailto), y siempre target/rel a pestaña nueva.

const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "br",
  "p", "div", "span",
  "ul", "ol", "li",
  "a",
];

export function sanitizeIntroHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    // Solo http(s) y mailto, igual que la versión anterior.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] },
    disallowedTagsMode: "discard",
    // Los links van siempre a pestaña nueva y sin filtrar el referrer. Se agrega
    // sobre el árbol ya parseado, no concatenando strings (el bug de antes).
    transformTags: {
      a: (tagName, attribs) => {
        const out = { ...attribs };
        if (out.href) {
          out.target = "_blank";
          out.rel = "noopener noreferrer nofollow";
        }
        return { tagName: "a", attribs: out };
      },
    },
  });
}
