-- =====================================================================
-- Test de la migración 0019: el cliente solo puede tocar `estado`.
--
-- Correlo entero en el SQL Editor DESPUÉS de aplicar 0019.
--
-- >>> TERMINA EN UN "ERROR" Y ESTÁ BIEN. <<<
-- El error es el reporte: el test lanza una excepción a propósito al final.
-- Leé el mensaje, ahí están los 5 resultados. La excepción además aborta la
-- transacción, que es lo que borra los datos de prueba. Si termina "sin error",
-- algo salió mal.
--
-- Es un único bloque DO a propósito: el SQL Editor aísla cada statement (pooler
-- en modo transacción), así que las tablas temporales y los begin/rollback de
-- varios statements no funcionan. Todo tiene que pasar en una sola sentencia.
--
-- Es autocontenido: se crea su propio usuario/cuenta/pieza y no deja nada.
--
-- Cómo funciona: el trigger dispara para cualquier rol y decide según
-- auth_role(), que lee profiles por auth.uid(). Alcanza con simular el claim
-- JWT del usuario de prueba; no hace falta cambiar de rol de Postgres.
-- =====================================================================

do $$
declare
  v_user   uuid := gen_random_uuid();
  v_client uuid;
  v_cal    uuid;
  v_post   uuid;
  v_out    text := '';
  v_fallas int  := 0;
begin
  -- ---------- Datos de prueba ----------
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated',
          'authenticated', 'test-0019@example.invalid', now(), now());

  insert into clients (name) values ('Cuenta de prueba 0019') returning id into v_client;

  insert into profiles (id, role, client_id, full_name)
  values (v_user, 'client', v_client, 'Cliente de prueba');

  insert into calendars (client_id, month, year)
  values (v_client, 1, 2099) returning id into v_cal;

  insert into posts (calendar_id, tipo, plataforma, copy, objetivo, estado)
  values (v_cal, 'carrusel', 'instagram', 'copy original', 'marca', 'pendiente')
  returning id into v_post;

  -- Simular que el usuario logueado es este cliente.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  if auth_role() is distinct from 'client' then
    raise exception 'El setup falló: auth_role() devolvió %, esperaba client', auth_role();
  end if;

  -- ---------- 1. No puede reescribir el copy ----------
  begin
    update posts set copy = 'hackeado' where id = v_post;
    v_out := v_out || E'\n  1. cambiar copy .................. FALLA (pudo cambiarlo)';
    v_fallas := v_fallas + 1;
  exception when check_violation then
    v_out := v_out || E'\n  1. cambiar copy .................. OK (bloqueado)';
  end;

  -- ---------- 2. No puede cambiar la fecha de publicación ----------
  begin
    update posts set publish_date = '2099-01-01' where id = v_post;
    v_out := v_out || E'\n  2. cambiar publish_date .......... FALLA (pudo cambiarla)';
    v_fallas := v_fallas + 1;
  exception when check_violation then
    v_out := v_out || E'\n  2. cambiar publish_date .......... OK (bloqueado)';
  end;

  -- ---------- 3. No puede colar un cambio junto al estado ----------
  begin
    update posts set estado = 'aprobado', drive_url = 'http://malo' where id = v_post;
    v_out := v_out || E'\n  3. colar drive_url con estado .... FALLA (lo coló)';
    v_fallas := v_fallas + 1;
  exception when check_violation then
    v_out := v_out || E'\n  3. colar drive_url con estado .... OK (bloqueado)';
  end;

  -- ---------- 4. No puede ponerse en 'pendiente' (dispara agency_resolved) ----------
  begin
    update posts set estado = 'cambios_pedidos' where id = v_post;
    update posts set estado = 'pendiente' where id = v_post;
    v_out := v_out || E'\n  4. estado = pendiente ............ FALLA (pudo ponerlo)';
    v_fallas := v_fallas + 1;
  exception when check_violation then
    v_out := v_out || E'\n  4. estado = pendiente ............ OK (bloqueado)';
  end;

  -- ---------- 5. SÍ puede aprobar (el flujo real no se rompe) ----------
  begin
    update posts set estado = 'aprobado' where id = v_post;
    if (select estado from posts where id = v_post) = 'aprobado' then
      v_out := v_out || E'\n  5. aprobar (flujo real) .......... OK (sigue funcionando)';
    else
      v_out := v_out || E'\n  5. aprobar (flujo real) .......... FALLA (no se guardó)';
      v_fallas := v_fallas + 1;
    end if;
  exception when others then
    v_out := v_out || E'\n  5. aprobar (flujo real) .......... FALLA (se rompió: ' || sqlerrm || ')';
    v_fallas := v_fallas + 1;
  end;

  -- Excepción a propósito: es el reporte, y deshace los datos de prueba.
  raise exception E'\n=== TEST 0019 — % ===\n%\n\n(Este error es a propósito: aborta la transacción y borra los datos de prueba.)\n',
    case when v_fallas = 0 then 'TODO OK' else v_fallas || ' FALLA(S)' end,
    v_out;
end $$;
