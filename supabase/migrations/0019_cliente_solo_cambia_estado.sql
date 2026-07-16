-- =====================================================================
-- Migración 0019: el cliente solo puede tocar `estado`, nada más
--
-- posts_client_update (0002) da UPDATE sobre la fila entera: el USING/WITH CHECK
-- valida a QUÉ filas accede el cliente, pero no QUÉ columnas puede escribir.
-- La UI solo ofrece aprobar / pedir cambios, pero eso es cosmético: con la anon
-- key y el id de una pieza propia, un cliente puede reescribir el `copy`, la
-- `publish_date` o el `drive_url` del trabajo de la agencia.
--
-- Mismo razonamiento que 0016 con el borrado de comentarios: si la restricción
-- solo vive en la UI, alcanza con pegarle a la API. Tiene que vivir en la DB.
--
-- Las políticas RLS no pueden restringir por columna, así que va un trigger.
--
-- Enfoque fail-closed a propósito: en vez de enumerar las columnas prohibidas,
-- compara la fila entera menos las permitidas. Una columna nueva queda protegida
-- sola, sin que nadie se acuerde de volver acá.
-- =====================================================================

create or replace function enforce_client_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo aplica a usuarios 'client'. La agencia sigue con control total, y el
  -- service_role (auth.uid() null -> auth_role() null) tampoco entra acá.
  if auth_role() is distinct from 'client' then
    return new;
  end if;

  -- updated_at lo pisa el trigger posts_set_updated_at, no el cliente: se
  -- excluye de la comparación junto con estado, la única columna permitida.
  if (to_jsonb(new) - 'estado' - 'updated_at')
     is distinct from
     (to_jsonb(old) - 'estado' - 'updated_at') then
    raise exception 'Un cliente solo puede cambiar el estado de una pieza'
      using errcode = 'check_violation';
  end if;

  -- Aprobar o pedir cambios. 'pendiente' es de la agencia al resolver una
  -- corrección: si lo pusiera el cliente, dispararía un 'agency_resolved'
  -- ("hay contenido nuevo para revisar") que nadie generó.
  if new.estado is distinct from old.estado
     and new.estado not in ('aprobado', 'cambios_pedidos') then
    raise exception 'Un cliente solo puede aprobar o pedir cambios'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Después de posts_set_updated_at (los triggers corren por orden alfabético):
-- así ve el updated_at ya pisado, que igual excluye de la comparación.
drop trigger if exists posts_zz_enforce_client_update on posts;
create trigger posts_zz_enforce_client_update
  before update on posts
  for each row execute function enforce_client_post_update();
