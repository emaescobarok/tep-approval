-- =====================================================================
-- Migración 0022: 9 vistas previas por cuenta, cada mes, automático
--
-- Cada mes, en TODAS las cuentas, aparecen 9 piezas "vista previa" (color de
-- fondo + texto, sin material), repartidas en fechas y con colores variados. Son
-- piezas normales: la agencia las edita como cualquier otra (media, copy,
-- objetivo, fase...). Pensado para arrancar el mes con una grilla ya armada.
--
--  - `seed_month_previews(month, year)`: siembra ese mes en cada cliente.
--    Idempotente: si una cuenta ya tiene vistas previas 'Pieza N' ese mes, la
--    saltea. SECURITY DEFINER para poder insertar saltando RLS.
--  - Se corre YA para el mes actual.
--  - Un cron (pg_cron) la corre el día 1 de cada mes para el mes nuevo.
-- =====================================================================

create extension if not exists pg_cron with schema extensions;

create or replace function seed_month_previews(p_month smallint, p_year smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colors text[] := array['lima','ambar','durazno','rosa','violeta','cielo','esmeralda','vino','claro'];
  v_client record;
  v_cal_id uuid;
  v_base   int;
  i        int;
  v_day    int;
begin
  for v_client in select id from clients loop
    -- Calendario del mes (se crea si no existe).
    select id into v_cal_id
      from calendars
      where client_id = v_client.id and month = p_month and year = p_year;
    if v_cal_id is null then
      insert into calendars (client_id, month, year)
        values (v_client.id, p_month, p_year)
        returning id into v_cal_id;
    end if;

    -- Si ya se sembró este mes, no duplicar.
    if exists (select 1 from posts where calendar_id = v_cal_id and preview_text like 'Pieza %') then
      continue;
    end if;

    select coalesce(max(position), -1) + 1 into v_base from posts where calendar_id = v_cal_id;

    for i in 1..9 loop
      v_day := least(1 + (i - 1) * 3, 28);  -- 1,4,7,...,25 (tope 28 por meses cortos)
      insert into posts (
        calendar_id, tipo, objetivo, plataforma, estado, fase,
        position, publish_date, preview_bg, preview_text
      ) values (
        v_cal_id, 'imagen', 'marca', 'instagram', 'pendiente', 'borrador',
        v_base + (i - 1),
        make_date(p_year::int, p_month::int, v_day),
        v_colors[i],
        'Pieza ' || i
      );
    end loop;
  end loop;
end;
$$;

-- Solo el service_role la ejecuta directo; nadie más la necesita.
revoke all on function seed_month_previews(smallint, smallint) from public, anon, authenticated;

-- Sembrar el mes actual ya.
select seed_month_previews(extract(month from now())::smallint, extract(year from now())::smallint);

-- Cron: el día 1 de cada mes (06:00 UTC) siembra el mes nuevo en todas las cuentas.
select cron.unschedule('seed-month-previews')
where exists (select 1 from cron.job where jobname = 'seed-month-previews');

select cron.schedule(
  'seed-month-previews',
  '0 6 1 * *',
  $$ select seed_month_previews(extract(month from now())::smallint, extract(year from now())::smallint); $$
);
