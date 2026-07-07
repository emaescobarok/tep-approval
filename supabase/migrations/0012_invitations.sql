-- =====================================================================
-- Migración 0012: invitaciones por link con vencimiento propio
--
-- En vez de crear el usuario al invitar y depender del token de Supabase
-- (que expira rápido), guardamos una invitación con su propio token y
-- expires_at. La cuenta se crea recién cuando la persona acepta y define
-- su contraseña en /invitacion/<token>.
--
-- RLS habilitada sin políticas: solo se accede vía service_role desde el
-- servidor (las Server Actions validan la autorización antes).
-- =====================================================================

create table if not exists invitations (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,
  email      text not null,
  full_name  text,
  role       user_role not null,
  client_id  uuid references clients(id) on delete cascade,
  is_admin   boolean not null default false,
  is_pm      boolean not null default false,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invitations_token_idx on invitations(token);

alter table invitations enable row level security;
