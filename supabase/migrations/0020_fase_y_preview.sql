-- =====================================================================
-- Migración 0020: fase de producción + placeholder de vista previa
--
-- Dos ejes nuevos en la pieza, independientes del `estado` de aprobación:
--
--  - `fase`: en qué paso de producción está la pieza (Borrador → Revisión →
--    Producción → Check final → Programado → Publicado). La maneja la agencia;
--    el cliente solo la ve. Cada fase tiene un texto fijo (vive en el código,
--    src/lib/types.ts FASE_TEXTO) que sí ve el cliente.
--
--  - `preview_bg` / `preview_text`: cuando la pieza todavía no tiene material,
--    la agencia elige un color de fondo (clave de paleta, ej. 'lime') y un
--    texto, para mandarle al cliente un cuadrado prolijo en vez de un ícono
--    vacío. Se ignoran en cuanto la pieza tiene media.
--
-- RLS: no se toca. El trigger enforce_client_post_update (0019) es fail-closed
-- (compara la fila entera menos 'estado'/'updated_at'), así que estas columnas
-- nuevas quedan protegidas del cliente solas.
-- =====================================================================

-- Idempotente: si una corrida anterior ya creó el type, no vuelve a fallar.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_fase') then
    create type post_fase as enum (
      'borrador', 'revision', 'produccion', 'check_final', 'programado', 'publicado'
    );
  end if;
end $$;

alter table posts add column if not exists fase post_fase not null default 'borrador';
alter table posts add column if not exists preview_bg text;
alter table posts add column if not exists preview_text text;
