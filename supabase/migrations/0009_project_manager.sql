-- =====================================================================
-- Migración 0009: rol Project Manager (PM)
--
-- Tercer nivel dentro de la agencia, entre admin y estratega:
--  - is_admin = true            -> Admin: todo, incluido BORRAR cuentas.
--  - is_pm = true (no admin)    -> Project Manager: gestiona SOLO las cuentas
--                                  que el admin le asigna (editar datos,
--                                  invitar usuarios cliente, asignar estrategas).
--                                  NO ve todas las cuentas, no crea/borra cuentas
--                                  ni promueve roles.
--  - ambos false                -> Estratega: solo contenido de sus clientes
--                                  asignados. No invita ni gestiona cuentas.
--
-- El PM se acota por client_assignments igual que el estratega; la diferencia
-- son sus poderes de GESTIÓN (validados en las Server Actions con requireManager
-- + chequeo de acceso al cliente). La mayoría de esas operaciones pasan por
-- service_role, por eso el gating fino vive en la app.
-- =====================================================================

-- 1) Columna
alter table profiles add column if not exists is_pm boolean not null default false;

-- 2) Helpers
create or replace function is_pm() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_pm from profiles where id = auth.uid()), false);
$$;

-- Admin o PM: puede gestionar cuentas/personas (no incluye borrar cuentas).
create or replace function can_manage() returns boolean
language sql stable security definer set search_path = public as $$
  select is_agency() and (is_admin() or is_pm());
$$;

-- 3) Acceso a un cliente: admin siempre; PM y estratega solo si lo tienen
--    asignado. (agency_can_access se mantiene igual que en 0005; se re-declara
--    acá por claridad, sin incluir a is_pm como acceso total.)
create or replace function agency_can_access(p_client_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_agency() and (
    is_admin() or exists (
      select 1 from client_assignments
      where agency_id = auth.uid() and client_id = p_client_id
    )
  );
$$;

-- 4) Asignaciones: el manager ve las de los clientes a los que accede
--    (admin: todas; PM: las de sus clientes asignados) para poder gestionarlas.
drop policy if exists assignments_manager_select on client_assignments;
create policy assignments_manager_select on client_assignments
  for select using (can_manage() and agency_can_access(client_id));
