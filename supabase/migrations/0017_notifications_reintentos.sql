-- =====================================================================
-- Migración 0017: la cola de notificaciones puede reintentar
--
-- Hasta acá `notifications` solo tenía delivered_at: o estaba entregada o no.
-- El worker marcaba delivered_at igual aunque Resend hubiera fallado (el error
-- se tragaba en un .catch), así que un fallo transitorio perdía el aviso para
-- siempre y sin rastro.
--
-- Se agregan dos columnas para que la cola tenga memoria:
--  - attempts:   intentos hechos. El worker frena a los 5 para no reintentar
--                infinito algo roto de verdad (ej: cuenta sin contact_email).
--  - last_error: por qué falló el último intento, para poder diagnosticar.
--
-- El índice parcial de pendientes se recrea incluyendo attempts, que ahora es
-- parte del filtro del worker.
-- =====================================================================

alter table notifications
  add column if not exists attempts   integer not null default 0,
  add column if not exists last_error text;

drop index if exists notifications_pending_idx;
create index notifications_pending_idx
  on notifications (created_at)
  where delivered_at is null;
