-- =====================================================================
-- Migración 0006: introducción de la planificación, link de Drive y portada
--  - calendars.intro     -> texto de introducción del mes (lo escribe el estratega)
--  - posts.drive_url      -> link de Google Drive con la imagen/video de la pieza
--  - posts.cover_path     -> portada (para Reels): ruta en Storage de la imagen tapa
-- No requiere cambios de RLS (heredan las políticas de sus tablas).
-- =====================================================================

alter table calendars add column if not exists intro text;
alter table posts     add column if not exists drive_url text;
alter table posts     add column if not exists cover_path text;
