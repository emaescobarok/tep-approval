-- =====================================================================
-- Migración 0010: menciones entre usuarios en los comentarios (@usuario)
--
-- - comments.mentions: ids de los usuarios mencionados en el cuerpo
--   (se calcula en la app al guardar; se usa para resaltar en el hilo).
-- - notif_tipo 'mentioned': notificación dirigida a la persona mencionada.
--   El destinatario concreto (email) se resuelve en la app y viaja en el
--   payload (to_email), porque puede ser un usuario de agencia o de cliente.
-- =====================================================================

alter type notif_tipo add value if not exists 'mentioned';

alter table comments
  add column if not exists mentions uuid[] not null default '{}'::uuid[];
