-- =====================================================================
-- Seed de demo para Tep Agency
-- Crea un cliente demo con un calendario y algunas piezas de ejemplo.
--
-- NOTA sobre usuarios: los usuarios (auth.users + profiles) se crean vía
-- invitación desde la app (Supabase Auth). Para probar rápido, después de
-- correr este seed:
--   1) Creá un usuario en Auth > Users (o registralo) y anotá su UUID.
--   2) Insertá su profile de agencia:
--        insert into profiles (id, role, full_name)
--        values ('<uuid-del-usuario>', 'agency', 'Equipo Tep');
--   3) Para un usuario cliente, usá el flujo "Invitar usuario" de la app,
--      o a mano (client_id = cuenta ACTIVA, y la membresía da el acceso):
--        insert into profiles (id, role, client_id, full_name)
--          values ('<uuid>', 'client', '<client_id>', 'Cliente Demo');
--        insert into client_members (user_id, client_id)
--          values ('<uuid>', '<client_id>');
-- =====================================================================

insert into clients (id, name, contact_name, contact_email)
values
  ('11111111-1111-1111-1111-111111111111', 'Cafetería Aroma', 'Lucía Pérez', 'lucia@aroma.com'),
  ('22222222-2222-2222-2222-222222222222', 'Estudio Vidal', 'Marcos Vidal', 'marcos@vidal.com')
on conflict (id) do nothing;

-- Calendario de julio 2026 para Cafetería Aroma
insert into calendars (id, client_id, month, year)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', 7, 2026)
on conflict do nothing;

-- Piezas de ejemplo (sin media; la miniatura muestra el degradado)
-- `objetivo` es obligatorio desde 0015: sin él, el seed falla.
insert into posts (calendar_id, tipo, plataforma, copy, objetivo, estado, position) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'carrusel', 'instagram',
   '5 razones para empezar el día con un buen café ☕️', 'marca', 'pendiente', 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reel_video', 'instagram',
   null, 'productos', 'aprobado', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'imagen', 'facebook',
   'Nuevo blend de la casa, ya disponible.', 'promos', 'cambios_pedidos', 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'texto', 'linkedin',
   'Cómo elegimos nuestros granos de origen: un hilo.', 'faq', 'pendiente', 3)
on conflict do nothing;
