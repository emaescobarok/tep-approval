import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sanitizeIntroHtml } from "./sanitize.ts";

// Correr con: npm test
//
// Se verifica sobre el DOM parseado, no con regex sobre el string. La primera
// versión de este test usaba regex y daba falsos positivos: marcaba como
// vulnerable un &quot; escapado dentro de un href, que es inofensivo. Mirar el
// texto en vez del árbol es exactamente el error que tenía el sanitizador viejo.

function peligro(html: string): string | null {
  const { window } = new JSDOM(`<body>${html}</body>`);
  for (const el of Array.from(window.document.body.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) {
        return `atributo ${attr.name}="${attr.value}" en <${el.tagName.toLowerCase()}>`;
      }
      if (/^(href|src|action)$/i.test(attr.name) && /^\s*(javascript|data):/i.test(attr.value)) {
        return `${attr.name} con esquema peligroso: ${attr.value}`;
      }
    }
    if (/^(SCRIPT|IFRAME|SVG|FORM|OBJECT|EMBED)$/.test(el.tagName)) {
      return `elemento <${el.tagName.toLowerCase()}>`;
    }
  }
  return null;
}

const ataques: [string, string][] = [
  ["script suelto", `<script>alert(1)</script>`],
  ["img onerror", `<img src=x onerror=alert(1)>`],
  ["href javascript:", `<a href="javascript:alert(1)">x</a>`],
  ["href sin comillas", `<a href=javascript:alert(1)>x</a>`],
  ["script anidado", `<scr<script>ipt>alert(1)</script>`],
  ["onclick en tag permitido", `<p onclick="alert(1)">x</p>`],
  // Este es el que rompía la versión a base de regex: el href entre comillas
  // simples podía contener una comilla doble y cerrar el atributo antes de
  // tiempo, quedando un onfocus real. Con autofocus dispara sin interacción.
  ["href en comilla simple", `<a href='https://x.com" onmouseover="alert(1)'>x</a>`],
  ["href comilla simple + autofocus", `<a href='https://x.com" onfocus="alert(1)" autofocus="'>x</a>`],
  ["javascript: con entidad", `<a href="jav&#97;script:alert(1)">x</a>`],
  ["data: uri", `<a href="data:text/html,<script>alert(1)</script>">x</a>`],
  ["svg onload", `<svg onload=alert(1)>`],
  ["iframe", `<iframe src="javascript:alert(1)"></iframe>`],
  ["style con javascript:", `<p style="background:url(javascript:alert(1))">x</p>`],
  ["form action", `<form action="javascript:alert(1)"><button>x</button></form>`],
  ["marquee onstart", `<marquee onstart=alert(1)>x</marquee>`],
  ["doble encoding", `<a href="&#106;avascript&#58;alert(1)">x</a>`],
];

for (const [nombre, entrada] of ataques) {
  test(`bloquea: ${nombre}`, () => {
    const problema = peligro(sanitizeIntroHtml(entrada));
    assert.equal(problema, null, `escapó -> ${problema}\n  entrada: ${entrada}\n  salida : ${sanitizeIntroHtml(entrada)}`);
  });
}

// El sanitizador tiene que dejar pasar lo que la agencia escribe de verdad.
// Sin esto, "bloquear todo" pasaría los tests de arriba y rompería el producto.

test("conserva el formato básico", () => {
  const html = `<p>Hola <b>equipo</b>, este mes vamos con <i>tres pilares</i>.</p>`;
  assert.equal(sanitizeIntroHtml(html), html);
});

test("conserva las listas", () => {
  const html = `<ul><li>Marca</li><li>Producto</li></ul>`;
  assert.equal(sanitizeIntroHtml(html), html);
});

test("conserva los links https y les pone target/rel", () => {
  const out = sanitizeIntroHtml(`<a href="https://tepagency.com">sitio</a>`);
  assert.match(out, /href="https:\/\/tepagency\.com"/);
  assert.match(out, /target="_blank"/);
  assert.match(out, /rel="noopener noreferrer nofollow"/);
});

test("conserva los links mailto", () => {
  assert.match(sanitizeIntroHtml(`<a href="mailto:equipo@tepagency.com">x</a>`), /href="mailto:equipo@tepagency\.com"/);
});

test("string vacío devuelve vacío", () => {
  assert.equal(sanitizeIntroHtml(""), "");
});
