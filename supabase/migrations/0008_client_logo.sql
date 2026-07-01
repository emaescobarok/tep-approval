-- =====================================================================
-- Migración 0008: logo del cliente
--  - clients.logo_url -> URL pública del logo
--  - bucket 'client-logos' público (los logos no son sensibles)
-- La subida se hace con service_role (salta RLS); la lectura es pública.
-- =====================================================================

alter table clients add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;
