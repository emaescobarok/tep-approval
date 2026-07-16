-- =====================================================================
-- Migración 0018: el cron de notificaciones se muda a Postgres (pg_cron)
--
-- Antes el cron vivía en vercel.json. Dos problemas:
--  1. Vercel Cron invoca con GET y el endpoint solo exportaba POST -> 405.
--     La cola nunca se vaciaba. (El endpoint ya acepta ambos, ver route.ts.)
--  2. El plan Hobby solo permite un cron por día: un cliente que pedía cambios
--     a las 9:05 se avisaba recién al otro día.
--
-- pg_cron corre dentro de Supabase, no depende del plan de Vercel, y permite
-- cada 5 min. El endpoint queda igual: esto solo cambia quién lo llama.
--
-- ---------------------------------------------------------------------
-- ANTES DE CORRER ESTA MIGRACIÓN
-- ---------------------------------------------------------------------
-- La URL y el secreto NO van hardcodeados acá (este archivo está en git).
-- Se guardan en Supabase Vault. Corré esto una vez en el SQL Editor,
-- reemplazando los valores por los tuyos:
--
--   select vault.create_secret(
--     'https://tu-app.vercel.app/api/notifications/dispatch', 'dispatch_url');
--   select vault.create_secret(
--     '<el mismo valor que CRON_SECRET en Vercel>', 'dispatch_secret');
--
-- Para rotarlos después: vault.update_secret(id, nuevo_valor).
-- =====================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Lee los secretos del Vault y le pega al worker. Si falta alguno, avisa en vez
-- de fallar en silencio (pg_cron guarda el error en cron.job_run_details).
create or replace function dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'dispatch_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'dispatch_secret';

  if v_url is null or v_secret is null then
    raise exception 'Faltan los secretos dispatch_url / dispatch_secret en el Vault';
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', v_secret
               ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Solo el service_role la ejecuta; nadie más necesita tocarla.
revoke all on function dispatch_notifications() from public, anon, authenticated;

-- Reprogramar es idempotente: si el job ya existe, unschedule primero.
select cron.unschedule('dispatch-notifications')
where exists (select 1 from cron.job where jobname = 'dispatch-notifications');

select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  $$ select dispatch_notifications(); $$
);

-- Para ver cómo viene:
--   select * from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'dispatch-notifications')
--     order by start_time desc limit 20;
