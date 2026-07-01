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
