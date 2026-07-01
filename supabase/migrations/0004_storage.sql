-- =====================================================================
-- Migración 0004: bucket de Storage para la media de las piezas
-- Ruta convención: <client_id>/<post_id>/<archivo>
-- La primera carpeta = client_id permite aislar por cliente vía RLS.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', false)
on conflict (id) do nothing;

-- Agencia: sube/gestiona todo
create policy "agency manages post-media"
  on storage.objects for all
  using (bucket_id = 'post-media' and is_agency())
  with check (bucket_id = 'post-media' and is_agency());

-- Cliente: solo lee archivos cuya primera carpeta es su client_id
create policy "client reads own post-media"
  on storage.objects for select
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth_client_id()::text
  );
