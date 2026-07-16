-- =====================================================================
-- Migración 0014: la "categoría" pasa a llamarse "objetivo" y suma 'otro'
--  - post_categoria    -> post_objetivo   (rename, preserva los datos)
--  - posts.categoria   -> posts.objetivo  (rename, preserva los datos)
--  - nuevo valor 'otro' + posts.objetivo_otro para el texto libre
-- Sigue siendo opcional. No requiere cambios de RLS.
-- =====================================================================

alter type post_categoria rename to post_objetivo;
alter table posts rename column categoria to objetivo;
alter index if exists posts_categoria_idx rename to posts_objetivo_idx;

alter type post_objetivo add value if not exists 'otro';

alter table posts add column if not exists objetivo_otro text;

-- Si el objetivo es 'otro', el texto libre es obligatorio (y solo aplica a 'otro').
-- Se compara con ::text a propósito: usar el literal 'otro' del enum en la misma
-- transacción en que se agrega el valor es un error en Postgres.
alter table posts drop constraint if exists posts_objetivo_otro_check;
alter table posts add constraint posts_objetivo_otro_check check (
  case
    when objetivo::text = 'otro' then objetivo_otro is not null and length(trim(objetivo_otro)) > 0
    else objetivo_otro is null
  end
);
