-- =====================================================================
-- Migración 0005: estrategas con acceso limitado a ciertos clientes
--
-- Modelo:
--  - profiles.is_admin = true  -> dueño/admin de la agencia: ve TODO y asigna.
--  - role='agency' e is_admin=false -> estratega: solo ve los clientes
--    que tiene asignados en client_assignments.
--  - El aislamiento lo garantiza la RLS (no el frontend).
-- =====================================================================

-- 1) Columna admin y tabla de asignaciones
alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists client_assignments (
  agency_id  uuid not null references profiles(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (agency_id, client_id)
);
alter table client_assignments enable row level security;

-- 2) Helpers
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ¿El usuario agencia actual puede acceder a este cliente?
-- Admin: siempre. Estratega: solo si lo tiene asignado.
create or replace function agency_can_access(p_client_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_agency() and (
    is_admin() or exists (
      select 1 from client_assignments
      where agency_id = auth.uid() and client_id = p_client_id
    )
  );
$$;

-- 3) Reescritura de políticas de agencia (de is_agency() -> agency_can_access)

-- clients
drop policy if exists clients_agency_all on clients;
create policy clients_admin_all on clients
  for all using (is_admin()) with check (is_admin());
create policy clients_agency_select on clients
  for select using (agency_can_access(id));

-- profiles: la escritura queda solo para admin (los invites usan service_role y saltan RLS igual)
drop policy if exists profiles_agency_write on profiles;
create policy profiles_admin_write on profiles
  for all using (is_admin()) with check (is_admin());

-- calendars
drop policy if exists calendars_agency_all on calendars;
create policy calendars_agency_all on calendars
  for all using (agency_can_access(client_id)) with check (agency_can_access(client_id));

-- posts (client_id vía calendars)
drop policy if exists posts_agency_all on posts;
create policy posts_agency_all on posts
  for all using (
    exists (select 1 from calendars c where c.id = posts.calendar_id and agency_can_access(c.client_id))
  ) with check (
    exists (select 1 from calendars c where c.id = posts.calendar_id and agency_can_access(c.client_id))
  );

-- post_media (client_id vía posts -> calendars)
drop policy if exists media_agency_all on post_media;
create policy media_agency_all on post_media
  for all using (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = post_media.post_id and agency_can_access(c.client_id)
    )
  ) with check (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = post_media.post_id and agency_can_access(c.client_id)
    )
  );

-- comments
drop policy if exists comments_agency_all on comments;
create policy comments_agency_all on comments
  for all using (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = comments.post_id and agency_can_access(c.client_id)
    )
  ) with check (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = comments.post_id and agency_can_access(c.client_id)
    )
  );

-- notifications
drop policy if exists notifications_agency_select on notifications;
create policy notifications_agency_select on notifications
  for select using (is_admin() or agency_can_access(client_id));

-- client_assignments: admin gestiona todo; el estratega ve sus propias asignaciones
create policy assignments_admin_all on client_assignments
  for all using (is_admin()) with check (is_admin());
create policy assignments_self_select on client_assignments
  for select using (agency_id = auth.uid());

-- 4) Storage: limitar la gestión de la agencia a clientes accesibles
--    (la primera carpeta de la ruta es el client_id)
drop policy if exists "agency manages post-media" on storage.objects;
create policy "agency manages post-media"
  on storage.objects for all
  using (
    bucket_id = 'post-media'
    and agency_can_access(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'post-media'
    and agency_can_access(((storage.foldername(name))[1])::uuid)
  );
