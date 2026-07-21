-- =====================================================================
-- Migración 0021: un login de cliente puede acceder a varias cuentas
--
-- Caso: el mismo dueño tiene 2+ cuentas (clients). Antes un login era de UNA
-- sola cuenta (profiles.client_id, con role_client_coherence), así que invitar
-- el mismo email a una segunda cuenta fallaba ("ya existe una cuenta").
--
-- Modelo:
--  - `client_members(user_id, client_id)`: qué cuentas PUEDE usar cada login.
--    Es la fuente de verdad del acceso.
--  - `profiles.client_id` pasa a ser la cuenta ACTIVA (la que se está viendo).
--    Las policies RLS existentes siguen filtrando por la cuenta activa, así que
--    NO se tocan: cambiar de cuenta = cambiar profiles.client_id (validando que
--    exista la membresía). Aislamiento intacto: solo se ve una cuenta a la vez.
-- =====================================================================

create table if not exists client_members (
  user_id    uuid not null references auth.users(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
create index if not exists client_members_user_idx on client_members(user_id);

alter table client_members enable row level security;

-- Cada usuario ve sus propias membresías; la agencia gestiona todo.
drop policy if exists client_members_self_select on client_members;
create policy client_members_self_select on client_members
  for select using (user_id = auth.uid());
drop policy if exists client_members_agency_all on client_members;
create policy client_members_agency_all on client_members
  for all using (is_agency()) with check (is_agency());

-- Backfill: cada profile 'client' existente pasa a tener su membresía.
insert into client_members (user_id, client_id)
  select id, client_id from profiles
  where role = 'client' and client_id is not null
  on conflict do nothing;

-- El cliente necesita leer el nombre/logo de TODAS sus cuentas (para el selector),
-- no solo la activa. Se amplía la policy de select de clients a sus membresías.
drop policy if exists clients_client_select on clients;
create policy clients_client_select on clients
  for select using (
    id in (select client_id from client_members where user_id = auth.uid())
  );
