"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ObjetivoPicker } from "@/components/objetivo-picker";
import { PreviewPicker } from "@/components/preview-picker";
import {
  PLATAFORMA_DEFAULT,
  TIPOS_FORM,
  TIPO_LABEL,
  TIPOS_CON_COPY_OBLIGATORIO,
  type PostObjetivo,
  type PostTipo,
} from "@/lib/types";
import { Upload } from "lucide-react";

export function NewPostForm({
  clientId,
  month,
  year,
  onCreated,
}: {
  clientId: string;
  month: number;
  year: number;
  // Se llama después de crear la pieza (ej. para cerrar el modal).
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<PostTipo>("imagen");
  // "" = sin objetivo (es opcional).
  const [objetivo, setObjetivo] = useState<PostObjetivo | "">("");
  const [objetivoOtro, setObjetivoOtro] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [copy, setCopy] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [previewBg, setPreviewBg] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyRequired = TIPOS_CON_COPY_OBLIGATORIO.includes(tipo);
  const isReel = tipo === "reel_video";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (copyRequired && !copy.trim()) {
      setError("El copy es obligatorio para carrusel y texto.");
      return;
    }
    if (!objetivo) {
      setError("Elegí el objetivo de la pieza.");
      return;
    }
    if (objetivo === "otro" && !objetivoOtro.trim()) {
      setError("Escribí cuál es el objetivo.");
      return;
    }
    if (!publishDate) {
      setError("Elegí la fecha de publicación.");
      return;
    }
    setBusy(true);

    const supabase = createClient();
    const folder = crypto.randomUUID();

    // Sube un archivo a Storage y devuelve su ruta (o null si falla, ya seteando error).
    async function subir(file: File): Promise<{ storage_path: string; media_type: "image" | "video" } | null> {
      const path = `${clientId}/${folder}/${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(`Error al subir ${file.name}: ${upErr.message}`);
        return null;
      }
      return { storage_path: path, media_type: file.type.startsWith("video") ? "video" : "image" };
    }

    // Historia con varias imágenes: cada una es una historia de la secuencia.
    // Se crea una pieza por archivo (en orden), en vez de meter todo en una sola.
    if (tipo === "historia" && files.length > 1) {
      for (const file of files) {
        const m = await subir(file);
        if (!m) { setBusy(false); return; }
        const res = await createPost({
          clientId, month, year, tipo,
          objetivo, objetivoOtro,
          plataforma: PLATAFORMA_DEFAULT,
          copy, publishDate, driveUrl, coverPath: null, media: [m],
          previewBg, previewText,
        });
        if (!res.ok) {
          setBusy(false);
          setError(res.error ?? "No se pudo crear la historia.");
          return;
        }
      }
      setBusy(false);
      setCopy(""); setDriveUrl(""); setPublishDate("");
      setObjetivo(""); setObjetivoOtro("");
      setFiles([]); setCover(null);
      setPreviewBg(null); setPreviewText("");
      onCreated?.();
      router.refresh();
      return;
    }

    const media: { storage_path: string; media_type: "image" | "video" }[] = [];
    for (const file of files) {
      const m = await subir(file);
      if (!m) { setBusy(false); return; }
      media.push(m);
    }

    // Portada del reel (opcional)
    let coverPath: string | null = null;
    if (isReel && cover) {
      const cPath = `${clientId}/${folder}/cover-${cover.name}`;
      const { error: cErr } = await supabase.storage
        .from("post-media")
        .upload(cPath, cover, { upsert: false });
      if (cErr) {
        setError(`Error al subir la portada: ${cErr.message}`);
        setBusy(false);
        return;
      }
      coverPath = cPath;
    }

    const res = await createPost({
      clientId, month, year, tipo,
      objetivo, objetivoOtro,
      plataforma: PLATAFORMA_DEFAULT,
      copy, publishDate, driveUrl, coverPath, media,
      previewBg, previewText,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo crear la pieza.");
      return;
    }
    setCopy("");
    setDriveUrl("");
    setPublishDate("");
    setObjetivo("");
    setObjetivoOtro("");
    setFiles([]);
    setCover(null);
    setPreviewBg(null);
    setPreviewText("");
    onCreated?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Tipo</label>
          <Select
            value={tipo}
            onChange={setTipo}
            options={TIPOS_FORM.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="whitespace-nowrap text-sm font-medium">
            Fecha de publicación <span className="text-destructive">*</span>
          </label>
          <DatePicker value={publishDate} onChange={setPublishDate} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Objetivo <span className="text-destructive">*</span>
        </label>
        <ObjetivoPicker
          value={objetivo}
          onChange={setObjetivo}
          otro={objetivoOtro}
          onOtroChange={setObjetivoOtro}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Copy {copyRequired && <span className="text-destructive">*</span>}
        </label>
        <textarea
          value={copy} onChange={(e) => setCopy(e.target.value)} rows={3}
          required={copyRequired}
          placeholder={copyRequired ? "Obligatorio para este tipo" : "Opcional"}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Link de Drive (imagen/video)</label>
        <input
          type="url" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Media (imágenes/videos, en orden)</label>
        <input
          type="file" multiple accept="image/*,video/*"
          onChange={(e) =>
            setFiles(
              // Orden por nombre (numérico natural): el explorador de Windows no
              // garantiza el orden de selección, así el carrusel respeta 1, 2, 3...
              Array.from(e.target.files ?? []).sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
              )
            )
          }
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">{files.length} archivo(s) seleccionado(s)</p>
        )}
        {tipo === "historia" ? (
          <p className="text-xs text-muted-foreground">
            Podés elegir varias imágenes de una: cada una se crea como una historia de la secuencia del día.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tip: seleccioná varias imágenes juntas para no cargarlas de a una.
          </p>
        )}
      </div>

      {/* Vista previa: solo tiene sentido si todavía no hay material cargado.
          Le muestra al cliente un cuadrado con color + texto en vez de vacío. */}
      {files.length === 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Vista previa (si todavía no hay material)</label>
          <PreviewPicker
            bg={previewBg}
            onBgChange={setPreviewBg}
            text={previewText}
            onTextChange={setPreviewText}
          />
        </div>
      )}

      {isReel && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Portada del Reel (imagen)</label>
          <input
            type="file" accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm"
          />
          {cover && <p className="text-xs text-muted-foreground">Portada: {cover.name}</p>}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={busy}>
        <Upload className="size-4" />
        {busy ? "Subiendo..." : "Agregar pieza"}
      </Button>
    </form>
  );
}
