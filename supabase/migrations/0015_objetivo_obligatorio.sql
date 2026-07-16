-- =====================================================================
-- Migración 0015: el objetivo pasa a ser obligatorio
--
-- OJO: falla si alguna pieza tiene objetivo nulo. Es a propósito: preferimos
-- que corte antes que inventarle un objetivo a una pieza existente.
-- Para ver cuáles molestan:  select id from posts where objetivo is null;
-- =====================================================================

alter table posts alter column objetivo set not null;
