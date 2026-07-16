"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateIntro } from "./actions";
import { sanitizeIntroHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import {
  Save,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
  Pencil,
  Plus,
} from "lucide-react";

type Cmd = { icon: React.ReactNode; title: string; run: () => void };

// Editor de la introducción de la planificación del mes.
// Guarda HTML enriquecido (negrita, cursiva, listas, enlaces).
export function IntroEditor({
  clientId,
  month,
  year,
  initial,
}: {
  clientId: string;
  month: number;
  year: number;
  initial: string | null;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(!initial);
  // Lo guardado, para poder mostrarlo de solo lectura sin esperar el refresh.
  const [html, setHtml] = useState(initial ?? "");

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEmpty();
  }

  // Pegar como texto plano: evita traer tipografía/estilos de Word o Docs.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncEmpty();
  }

  function syncEmpty() {
    const html = editorRef.current?.innerHTML ?? "";
    setEmpty(!html || html === "<br>" || editorRef.current?.textContent?.trim() === "");
  }

  const commands: Cmd[] = [
    { icon: <Bold className="size-4" />, title: "Negrita", run: () => exec("bold") },
    { icon: <Italic className="size-4" />, title: "Cursiva", run: () => exec("italic") },
    { icon: <Underline className="size-4" />, title: "Subrayado", run: () => exec("underline") },
    { icon: <List className="size-4" />, title: "Lista con viñetas", run: () => exec("insertUnorderedList") },
    { icon: <ListOrdered className="size-4" />, title: "Lista numerada", run: () => exec("insertOrderedList") },
    {
      icon: <LinkIcon className="size-4" />,
      title: "Insertar enlace",
      run: () => {
        const url = window.prompt("URL del enlace (https://...)");
        if (url) exec("createLink", url);
      },
    },
    { icon: <Eraser className="size-4" />, title: "Quitar formato", run: () => exec("removeFormat") },
  ];

  async function save() {
    setBusy(true);
    const current = editorRef.current?.innerHTML ?? "";
    // Si quedó vacío, guardamos null para que no se muestre la tarjeta al cliente.
    const cleaned = editorRef.current?.textContent?.trim() ? current : "";
    await updateIntro({ clientId, month, year, intro: cleaned });
    setBusy(false);
    setHtml(cleaned);
    setEmpty(!cleaned);
    setEditing(false);
    router.refresh();
  }

  // Vista de lectura: es el estado por defecto. El editor solo aparece al tocar
  // "Editar", así la intro no se come el arranque de la página.
  if (!editing) {
    return (
      <div className="flex flex-col items-start gap-3">
        {html ? (
          <div
            className="prose-intro text-sm leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: sanitizeIntroHtml(html) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin introducción. La cuenta la ve arriba de su calendario.
          </p>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
          {html ? (
            <>
              <Pencil className="size-4" /> Editar introducción
            </>
          ) : (
            <>
              <Plus className="size-4" /> Agregar introducción
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-border bg-muted/40 px-2 py-1">
        {commands.map((c) => (
          <button
            key={c.title}
            type="button"
            title={c.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={c.run}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEmpty}
          onPaste={handlePaste}
          dangerouslySetInnerHTML={{ __html: html }}
          className="prose-intro min-h-28 -mt-2 rounded-b-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:ring-0"
        />
        {empty && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            Escribí la introducción de la planificación del mes (estrategia, recomendaciones, a tener en cuenta...). La cuenta la ve arriba de su calendario.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={busy}>
          <Save className="size-4" /> {busy ? "Guardando..." : "Guardar introducción"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          // Descarta lo tipeado: el editor se remonta con el html guardado.
          onClick={() => {
            setEditing(false);
            setEmpty(!html);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
