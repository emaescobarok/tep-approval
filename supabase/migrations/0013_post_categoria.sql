-- =====================================================================
-- Migración 0013: categoría (pilar de contenido) de cada pieza
--  - post_categoria       -> enum con los pilares fijos para todos los clientes
--  - posts.categoria      -> nullable: las piezas ya cargadas quedan sin categoría
-- Es un eje distinto de posts.tipo (que es el formato: carrusel/placa/reel/historia).
-- No requiere cambios de RLS.
-- =====================================================================

do $$ begin
  create type post_categoria as enum ('marca', 'productos', 'resenas', 'promos', 'faq');
exception when duplicate_object then null;
end $$;

alter table posts add column if not exists categoria post_categoria;
create index if not exists posts_categoria_idx on posts(categoria);
