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
