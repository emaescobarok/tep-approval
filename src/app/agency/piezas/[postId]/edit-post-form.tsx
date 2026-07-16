"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePost } from "../../clientes/[clientId]/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ObjetivoPicker } from "@/components/objetivo-picker";
import {
  TIPOS_CON_COPY_OBLIGATORIO,
  type MediaTipo,
  type PostObjetivo,
  type PostTipo,
} from "@/lib/types";
import { Upload, GripVertical, X, ImageOff } from "lucide-react";

type MediaItem = {
  key: string;
  storagePath: string | null; // null hasta que se sube (archivo nuevo)
  mediaType: MediaTipo;
  url: string; // signed url (existente) u objectURL (nuevo)
  file?: File; // presente solo en archivos nuevos
};

type InitialMedia = { storagePath: string; mediaType: MediaTipo; url: string };

export function EditPostForm({
  postId,
  clientId,
  tipo,
  initialObjetivo,
  initialObjetivoOtro,
  initialCopy,
  initialPublishDate,
  initialDriveUrl,
  initialMedia,
  initialCoverPath,
  initialCoverUrl,
}: {
  postId: string;
  clientId: string;
  tipo: PostTipo;
  initialObjetivo: PostObjetivo;
  initialObjetivoOtro: string;
  initialCopy: string;
  initialPublishDate: string;
  initialDriveUrl: string;
  initialMedia: InitialMedia[];
  initialCoverPath: string | null;
  initialCoverUrl: string | null;
}) {
  const router = useRouter();
  const isReel = tipo === "reel_video";
  const copyRequired = TIPOS_CON_COPY_OBLIGATORIO.includes(tipo);

  const [objetivo, setObjetivo] = useState<PostObjetivo | "">(initialObjetivo);
  const [objetivoOtro, setObjetivoOtro] = useState(initialObjetivoOtro);
  const [copy, setCopy] = useState(initialCopy);
  const [publishDate, setPublishDate] = useState(initialPublishDate);
  const [driveUrl, setDriveUrl] = useState(initialDriveUrl);
  const [items, setItems] = useState<MediaItem[]>(
    initialMedia.map((m, i) => ({
      key: `existing-${i}`,
      storagePath: m.storagePath,
      mediaType: m.mediaType,
      url: m.url,
    }))
  );
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  // Portada del reel
  const [coverPath, setCoverPath] = useState<string | null>(initialCoverPath);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    const next: MediaItem[] = files.map((file, i) => ({
      key: `new-${Date.now()}-${i}`,
      storagePath: null,
      mediaType: file.type.startsWith("video") ? "video" : "image",
      url: URL.createObjectURL(file),
      file,
    }));
    setItems((prev) => [...prev, ...next]);
  }

  function removeItem(idx: number) {
    setItems((prev) => {
      const item = prev[idx];
      // Si era existente (tiene storagePath y no es nuevo), marcarlo para borrar del Storage.
      if (item.storagePath && !item.file) setRemovedPaths((r) => [...r, item.storagePath!]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    setItems((prev) => {
      const copyArr = [...prev];
      const [moved] = copyArr.splice(from, 1);
      copyArr.splice(target, 0, moved);
      return copyArr;
    });
  }

  function changeCover(file: File | null) {
    if (!file) return;
    // La portada vieja (si existía y no es una recién puesta) se borra del Storage.
    if (coverPath) setRemovedPaths((r) => [...r, coverPath]);
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
    setCoverPath(null);
  }

  async function save() {
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

    // Sube los archivos nuevos y resuelve su storage_path.
    const media: { storage_path: string; media_type: MediaTipo }[] = [];
    for (const item of items) {
      let path = item.storagePath;
      if (item.file && !path) {
        path = `${clientId}/${folder}/${item.file.name}`;
        const { error: e } = await supabase.storage
          .from("post-media")
          .upload(path, item.file, { upsert: false });
        if (e) {
          setError(`Error al subir ${item.file.name}: ${e.message}`);
          setBusy(false);
          return;
        }
      }
      if (path) media.push({ storage_path: path, media_type: item.mediaType });
    }

    // Sube la portada nueva si cambió.
    let finalCoverPath = coverPath;
    if (coverFile) {
      const cPath = `${clientId}/${folder}/cover-${coverFile.name}`;
      const { error: e } = await supabase.storage
        .from("post-media")
        .upload(cPath, coverFile, { upsert: false });
      if (e) {
        setError(`Error al subir la portada: ${e.message}`);
        setBusy(false);
        return;
      }
      finalCoverPath = cPath;
    }

    const res = await updatePost({
      postId,
      clientId,
      tipo,
      objetivo,
      objetivoOtro,
      copy,
      publishDate,
      driveUrl,
      coverPath: isReel ? finalCoverPath : null,
      media,
      removedPaths,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar la pieza.");
      return;
    }
    router.push(`/agency/piezas/${postId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {isReel && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Portada del reel</label>
          <div className="flex items-center gap-3">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Portada" className="h-24 w-24 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground">
                <ImageOff className="size-5" />
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
              <Upload className="size-4" /> Cambiar portada
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => changeCover(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      )}

      {/* Imágenes / archivos (arrastrables) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Imágenes {items.length > 1 && <span className="text-muted-foreground">· arrastrá para reordenar</span>}
        </label>
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((item, idx) => (
              <div
                key={item.key}
                draggable
                onDragStart={() => (dragIndex.current = idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-border active:cursor-grabbing"
              >
                {item.mediaType === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="h-full w-full object-cover" draggable={false} />
                )}
                <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded bg-black/50 text-white">
                  <GripVertical className="size-3.5" />
                </span>
                <span className="absolute left-1 bottom-1 rounded bg-black/50 px-1 text-[10px] font-medium text-white">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  title="Quitar"
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          <Upload className="size-4" /> Agregar imágenes
          <input
            type="file" multiple accept="image/*,video/*" className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Objetivo */}
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

      {/* Copy */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Copy {copyRequired && <span className="text-muted-foreground">(obligatorio)</span>}
        </label>
        <textarea
          value={copy} onChange={(e) => setCopy(e.target.value)} rows={4}
          placeholder="Escribí el copy de la pieza..."
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Fecha */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Fecha de publicación</label>
        <DatePicker value={publishDate} onChange={setPublishDate} required />
      </div>

      {/* Drive */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Link de Drive (opcional)</label>
        <input
          type="url" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/agency/piezas/${postId}`)} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
