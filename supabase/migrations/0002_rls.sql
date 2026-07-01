-- =====================================================================
-- Migración 0002: Row Level Security
-- El aislamiento entre clientes vive en la base de datos, no en el frontend.
-- Un usuario 'client' NUNCA puede leer/escribir datos de otro cliente.
-- =====================================================================

-- Helpers SECURITY DEFINER: leen el rol/cliente del usuario actual sin
-- disparar RLS recursivo sobre profiles.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid();
$$;

create or replace function is_agency() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'agency', false);
$$;

-- Habilitar RLS en todas las tablas
alter table clients       enable row level security;
alter table profiles      enable row level security;
alter table calendars     enable row level security;
alter table posts         enable row level security;
alter table post_media    enable row level security;
alter table comments      enable row level security;
alter table notifications enable row level security;

-- ---------------- clients ----------------
-- Agencia: todo. Cliente: solo su propia fila.
create policy clients_agency_all on clients
  for all using (is_agency()) with check (is_agency());
create policy clients_client_select on clients
  for select using (id = auth_client_id());

-- ---------------- profiles ----------------
-- Cada uno ve su propio profile. La agencia ve todos. La agencia gestiona altas.
create policy profiles_self_select on profiles
  for select using (id = auth.uid());
create policy profiles_agency_select on profiles
  for select using (is_agency());
create policy profiles_agency_write on profiles
  for all using (is_agency()) with check (is_agency());

-- ---------------- calendars ----------------
create policy calendars_agency_all on calendars
  for all using (is_agency()) with check (is_agency());
create policy calendars_client_select on calendars
  for select using (client_id = auth_client_id());

-- ---------------- posts ----------------
-- Agencia: control total. Cliente: solo lee los de su cliente...
create policy posts_agency_all on posts
  for all using (is_agency()) with check (is_agency());
create policy posts_client_select on posts
  for select using (
    calendar_id in (select id from calendars where client_id = auth_client_id())
  );
-- ...y solo puede actualizar (aprobar / pedir cambios) piezas de su cliente.
create policy posts_client_update on posts
  for update using (
    calendar_id in (select id from calendars where client_id = auth_client_id())
  ) with check (
    calendar_id in (select id from calendars where client_id = auth_client_id())
  );

-- ---------------- post_media ----------------
create policy media_agency_all on post_media
  for all using (is_agency()) with check (is_agency());
create policy media_client_select on post_media
  for select using (
    post_id in (
      select p.id from posts p
      join calendars c on c.id = p.calendar_id
      where c.client_id = auth_client_id()
    )
  );

-- ---------------- comments ----------------
-- Agencia: todo. Cliente: lee y escribe comentarios de piezas de su cliente.
create policy comments_agency_all on comments
  for all using (is_agency()) with check (is_agency());
create policy comments_client_select on comments
  for select using (
    post_id in (
      select p.id from posts p
      join calendars c on c.id = p.calendar_id
      where c.client_id = auth_client_id()
    )
  );
create policy comments_client_insert on comments
  for insert with check (
    author_id = auth.uid()
    and author_role = 'client'
    and post_id in (
      select p.id from posts p
      join calendars c on c.id = p.calendar_id
      where c.client_id = auth_client_id()
    )
  );

-- ---------------- notifications ----------------
-- Solo la agencia (o el worker con service_role, que salta RLS) las consulta.
-- Los clientes ven las dirigidas a su cliente con recipient_role='client'.
create policy notifications_agency_select on notifications
  for select using (is_agency());
create policy notifications_client_select on notifications
  for select using (
    recipient_role = 'client' and client_id = auth_client_id()
  );
