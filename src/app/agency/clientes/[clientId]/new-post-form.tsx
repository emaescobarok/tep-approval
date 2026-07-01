"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  PLATAFORMA_DEFAULT,
  TIPOS_FORM,
  TIPO_LABEL,
  TIPOS_CON_COPY_OBLIGATORIO,
  type PostTipo,
} from "@/lib/types";
import { Upload } from "lucide-react";

export function NewPostForm({
  clientId,
  month,
  year,
}: {
  clientId: string;
  month: number;
  year: number;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<PostTipo>("imagen");
  const [publishDate, setPublishDate] = useState("");
  const [copy, setCopy] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
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
    if (!publishDate) {
      setError("Elegí la fecha de publicación.");
      return;
    }
    setBusy(true);

    const supabase = createClient();
    const folder = crypto.randomUUID();
    const media: { storage_path: string; media_type: "image" | "video" }[] = [];

    for (const file of files) {
      const path = `${clientId}/${folder}/${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(`Error al subir ${file.name}: ${upErr.message}`);
        setBusy(false);
        return;
      }
      media.push({
        storage_path: path,
        media_type: file.type.startsWith("video") ? "video" : "image",
      });
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
      clientId, month, year, tipo, plataforma: PLATAFORMA_DEFAULT,
      copy, publishDate, driveUrl, coverPath, media,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo crear la pieza.");
      return;
    }
    setCopy("");
    setDriveUrl("");
    setPublishDate("");
    setFiles([]);
    setCover(null);
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
          <label className="text-sm font-medium">
            Fecha de publicación <span className="text-destructive">*</span>
          </label>
          <input
            type="date" value={publishDate} required
            onChange={(e) => setPublishDate(e.target.value)}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">{files.length} archivo(s) seleccionado(s)</p>
        )}
      </div>

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
