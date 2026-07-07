-- =====================================================================
-- Migración 0011: marca de "menciones vistas" por usuario
--
-- Guarda cuándo el usuario abrió por última vez su panel de menciones,
-- para poder mostrar el contador de no leídas (menciones con created_at
-- posterior a esta marca). La actualización la hace la app con service_role
-- (el usuario no puede escribir su propio profile por RLS).
-- =====================================================================

alter table profiles
  add column if not exists mentions_seen_at timestamptz;
