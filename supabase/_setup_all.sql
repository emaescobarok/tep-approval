-- =====================================================================
-- Tep Agency — Plataforma de aprobación de contenido
-- Migración 0001: enums, tablas, constraints y reglas de negocio
-- =====================================================================

-- ---------- Enums ----------
create type user_role       as enum ('agency', 'client');
create type post_tipo       as enum ('carrusel', 'imagen', 'reel_video', 'historia', 'texto');
create type post_plataforma as enum ('instagram', 'facebook', 'tiktok', 'linkedin', 'x');
create type post_estado     as enum ('pendiente', 'aprobado', 'cambios_pedidos');
create type media_tipo      as enum ('image', 'video');
create type notif_tipo      as enum ('client_commented', 'client_approved', 'client_requested_changes', 'agency_resolved');

-- ---------- clients ----------
create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  contact_email text,
  created_at    timestamptz not null default now()
);

-- ---------- profiles (1:1 con auth.users) ----------
-- Un usuario 'agency' tiene client_id NULL (ve todo).
-- Un usuario 'client' tiene client_id fijo. Puede haber varios profiles por client.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null,
  client_id  uuid references clients(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now(),
  -- Coherencia rol/cliente: agency => sin client_id, client => con client_id
  constraint role_client_coherence check (
    (role = 'agency' and client_id is null) or
    (role = 'client' and client_id is not null)
  )
);
create index profiles_client_id_idx on profiles(client_id);

-- ---------- calendars (un mes/año por cliente) ----------
create table calendars (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  month      smallint not null check (month between 1 and 12),
  year       smallint not null check (year between 2020 and 2100),
  created_at timestamptz not null default now(),
  unique (client_id, month, year)
);
create index calendars_client_id_idx on calendars(client_id);

-- ---------- posts (piezas de contenido) ----------
create table posts (
  id          uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references calendars(id) on delete cascade,
  tipo        post_tipo not null,
  plataforma  post_plataforma not null,          -- una sola plataforma por pieza
  copy        text,
  estado      post_estado not null default 'pendiente',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Regla de negocio: copy obligatorio para carrusel y texto
  constraint copy_required check (
    tipo not in ('carrusel', 'texto') or (copy is not null and length(trim(copy)) > 0)
  )
);
create index posts_calendar_id_idx on posts(calendar_id);
create index posts_estado_idx on posts(estado);

-- ---------- post_media (adjuntos ordenados) ----------
create table post_media (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  storage_path text not null,          -- ruta en el bucket de Storage
  media_type   media_tipo not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index post_media_post_id_idx on post_media(post_id);

-- ---------- comments (hilo por pieza) ----------
create table comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  author_role user_role not null,       -- denormalizado para mostrar el hilo sin joins
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);
create index comments_post_id_idx on comments(post_id);

-- ---------- notifications (cola desacoplada) ----------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  type           notif_tipo not null,
  recipient_role user_role not null,     -- a quién va dirigida (agency | client)
  client_id      uuid references clients(id) on delete cascade,
  post_id        uuid references posts(id) on delete set null,
  payload        jsonb not null default '{}'::jsonb,
  delivered_at   timestamptz,            -- NULL = pendiente de enviar
  created_at     timestamptz not null default now()
);
create index notifications_pending_idx on notifications(delivered_at) where delivered_at is null;

-- ---------- updated_at automático en posts ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();
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
-- =====================================================================
-- Migración 0003: triggers que encolan notificaciones (modelo desacoplado)
-- Los triggers SOLO insertan filas en `notifications`. El envío real
-- (email/Slack/WhatsApp) lo hace un worker que lee la cola. Así se puede
-- sumar un canal nuevo sin tocar la base.
-- =====================================================================

-- Helper: client_id a partir de un post
create or replace function client_id_for_post(p_post_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.client_id
  from posts p join calendars c on c.id = p.calendar_id
  where p.id = p_post_id;
$$;

-- ---- Al cambiar el estado de una pieza ----
create or replace function on_post_estado_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
begin
  if new.estado is distinct from old.estado then
    select client_id into v_client_id from calendars where id = new.calendar_id;

    if new.estado = 'aprobado' then
      insert into notifications(type, recipient_role, client_id, post_id, payload)
      values ('client_approved', 'agency', v_client_id, new.id,
              jsonb_build_object('estado', 'aprobado'));

    elsif new.estado = 'cambios_pedidos' then
      insert into notifications(type, recipient_role, client_id, post_id, payload)
      values ('client_requested_changes', 'agency', v_client_id, new.id,
              jsonb_build_object('estado', 'cambios_pedidos'));

    elsif new.estado = 'pendiente' and old.estado = 'cambios_pedidos' then
      -- La agencia marcó la corrección como resuelta -> avisar al cliente
      insert into notifications(type, recipient_role, client_id, post_id, payload)
      values ('agency_resolved', 'client', v_client_id, new.id,
              jsonb_build_object('estado', 'pendiente'));
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_estado_notify
  after update on posts
  for each row execute function on_post_estado_change();

-- ---- Al comentar el cliente ----
create or replace function on_client_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
begin
  if new.author_role = 'client' then
    v_client_id := client_id_for_post(new.post_id);
    insert into notifications(type, recipient_role, client_id, post_id, payload)
    values ('client_commented', 'agency', v_client_id, new.post_id,
            jsonb_build_object('comment_id', new.id, 'preview', left(new.body, 140)));
  end if;
  return new;
end;
$$;

create trigger comments_client_notify
  after insert on comments
  for each row execute function on_client_comment();
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
