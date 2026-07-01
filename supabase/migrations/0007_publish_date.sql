-- =====================================================================
-- Migración 0007: fecha de publicación de cada pieza
--  - posts.publish_date -> fecha en que se publicará el contenido
-- No requiere cambios de RLS.
-- =====================================================================

alter table posts add column if not exists publish_date date;
create index if not exists posts_publish_date_idx on posts(publish_date);
