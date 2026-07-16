-- =====================================================================
-- Migración 0016: borrar comentarios queda solo para el admin
--
-- comments_agency_all era "for all", así que cubría también el DELETE: cualquier
-- usuario de agencia con acceso a la cuenta podía borrar comentarios. Como no
-- había botón, nadie lo hacía; ahora que lo hay, la restricción tiene que vivir
-- en la DB y no solo en la UI (si no, alcanza con pegarle a la API).
--
-- Se parte en dos: la agencia con acceso sigue leyendo/escribiendo, y el DELETE
-- pasa a exigir is_admin(). Las políticas permisivas se combinan con OR, así que
-- no alcanza con agregar una: hay que sacar el "for all".
-- =====================================================================

drop policy if exists comments_agency_all on comments;

-- Lectura, alta y edición: agencia con acceso a la cuenta (como antes).
create policy comments_agency_rw on comments
  for select using (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = comments.post_id and agency_can_access(c.client_id)
    )
  );

create policy comments_agency_insert on comments
  for insert with check (
    exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = comments.post_id and agency_can_access(c.client_id)
    )
  );

create policy comments_agency_update on comments
  for update using (
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

-- Borrado: solo admin, y solo en cuentas a las que tenga acceso.
create policy comments_admin_delete on comments
  for delete using (
    is_admin()
    and exists (
      select 1 from posts p join calendars c on c.id = p.calendar_id
      where p.id = comments.post_id and agency_can_access(c.client_id)
    )
  );
