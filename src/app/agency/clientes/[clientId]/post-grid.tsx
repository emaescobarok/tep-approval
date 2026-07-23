"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, CalendarDays, GripVertical } from "lucide-react";
import { MediaThumb } from "@/components/media-thumb";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeletePostButton } from "./delete-post-button";
import { reorderPosts } from "./actions";
import { TIPO_LABEL, FASE_LABEL, objetivoLabel, type Post } from "@/lib/types";
import { FASE_CHIP } from "@/components/tipo-colors";
import { formatPublishDate } from "@/lib/utils";

type Grupo = { card: Post; stories: Post[] };

// Grilla de piezas de la agencia con reordenamiento por drag & drop. Se arrastra
// la tarjeta protagonista; sus historias del día viajan con ella. Al soltar, se
// persiste el nuevo orden (aplanado: tarjeta + sus historias) vía reorderPosts.
export function PostGrid({
  grupos: gruposIniciales,
  thumbs,
  clientId,
}: {
  grupos: Grupo[];
  thumbs: Record<string, string | null>;
  clientId: string;
}) {
  const [grupos, setGrupos] = useState<Grupo[]>(gruposIniciales);
  const dragIndex = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  // El estado interno solo se inicializa al montar. Cuando el server manda datos
  // nuevos (se creó/borró/reordenó una pieza y router.refresh() re-renderiza),
  // hay que resincronizar, si no la grilla queda vieja hasta un F5. La firma
  // resume el orden e ids actuales; al cambiar, se adopta lo del server.
  const firma = gruposIniciales
    .map((g) => `${g.card.id}:${g.stories.map((s) => s.id).join(",")}`)
    .join("|");
  useEffect(() => {
    setGrupos(gruposIniciales);
    // gruposIniciales cambia de identidad en cada render; la firma es la que
    // refleja un cambio real de datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;

    const reordenado = [...grupos];
    const [movido] = reordenado.splice(from, 1);
    reordenado.splice(target, 0, movido);
    setGrupos(reordenado); // optimista

    // Aplana: cada tarjeta seguida de sus historias, en el nuevo orden.
    const orderedIds = reordenado.flatMap((g) => [g.card.id, ...g.stories.map((s) => s.id)]);
    startTransition(async () => {
      const res = await reorderPosts(clientId, orderedIds);
      if (!res.ok) setGrupos(gruposIniciales); // revierte si el server rechaza
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {grupos.map(({ card: post, stories }, idx) => (
        <div
          key={post.id}
          draggable
          onDragStart={() => (dragIndex.current = idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(idx)}
          className="group flex flex-col gap-1.5"
        >
          {/* Imagen protagonista (clickeable, abre el detalle) */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
            <Link href={`/agency/piezas/${post.id}`} className="block h-full w-full">
              <MediaThumb
                tipo={post.tipo}
                url={thumbs[post.id]}
                previewBg={post.preview_bg}
                previewText={post.preview_text}
                fill
                className="transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </Link>
            {/* Fecha + tipo sobre la imagen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 bg-gradient-to-b from-black/50 to-transparent p-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <Badge className="bg-black/50 text-white backdrop-blur-sm">{TIPO_LABEL[post.tipo]}</Badge>
                <Badge
                  title={objetivoLabel(post)}
                  className="max-w-[7rem] border-transparent bg-accent text-accent-foreground backdrop-blur-sm"
                >
                  <span className="truncate">{objetivoLabel(post)}</span>
                </Badge>
              </div>
              {post.publish_date && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-white drop-shadow">
                  <CalendarDays className="size-3" /> {formatPublishDate(post.publish_date)}
                </span>
              )}
            </div>
            {/* Agarradera para arrastrar */}
            <span
              title="Arrastrá para reordenar"
              className="absolute right-2 top-2 flex size-6 cursor-grab items-center justify-center rounded-md bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
            {/* Cantidad de historias del día, abajo dentro de la imagen */}
            {stories.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2">
                <Badge className="border-amber-400/40 bg-amber-400/20 text-amber-100 backdrop-blur-sm">
                  {stories.length} {stories.length === 1 ? "historia" : "historias"}
                </Badge>
              </div>
            )}
          </div>

          {/* Meta compacta debajo (sin copy: aparece al abrir la pieza) */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge estado={post.estado} />
              <Badge className={FASE_CHIP[post.fase]}>
                {FASE_LABEL[post.fase]}
              </Badge>
              {post.drive_url && (
                <a
                  href={post.drive_url} target="_blank" rel="noopener noreferrer"
                  title="Ver en Drive"
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" /> Drive
                </a>
              )}
            </div>
            <DeletePostButton postId={post.id} clientId={clientId} />
          </div>
        </div>
      ))}
    </div>
  );
}
