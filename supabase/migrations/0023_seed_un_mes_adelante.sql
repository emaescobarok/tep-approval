-- =====================================================================
-- Migración 0023: el sembrado de vistas previas va un mes adelantado
--
-- La agencia trabaja el mes SIGUIENTE, así que se siembra el mes que viene, no
-- el actual:
--   - Ahora (julio) -> se crea agosto.
--   - Cada día 1 el cron crea el mes siguiente (1 de agosto -> septiembre, etc.).
--
-- Reusa la función seed_month_previews de la 0022 (idempotente: no duplica).
-- =====================================================================

-- Sembrar el mes siguiente ya (agosto).
select seed_month_previews(
  extract(month from now() + interval '1 month')::smallint,
  extract(year  from now() + interval '1 month')::smallint
);

-- Reprogramar el cron: el día 1 (06:00 UTC) siembra el MES SIGUIENTE.
select cron.unschedule('seed-month-previews')
where exists (select 1 from cron.job where jobname = 'seed-month-previews');

select cron.schedule(
  'seed-month-previews',
  '0 6 1 * *',
  $$ select seed_month_previews(
       extract(month from now() + interval '1 month')::smallint,
       extract(year  from now() + interval '1 month')::smallint
     ); $$
);
