-- =====================================================================
-- Migración 0022 (SEED, una sola vez): 9 vistas previas por cuenta
--
-- Agrega 9 piezas "vista previa" (color de fondo + texto, sin material) al mes
-- ACTUAL de cada cuenta, repartidas en fechas y con colores variados. Son piezas
-- normales: la agencia las edita como cualquier otra (cargar media, cambiar copy,
-- objetivo, fase, etc.). Pensado para arrancar el mes con una grilla armada.
--
-- Idempotente: si una cuenta ya tiene vistas previas 'Pieza N' en ese mes, se
-- saltea (podés re-correrlo sin duplicar).
-- =====================================================================

do $$
declare
  v_month  smallint := extract(month from now())::smallint;
  v_year   smallint := extract(year  from now())::smallint;
  v_colors text[]   := array['lima','ambar','durazno','rosa','violeta','cielo','esmeralda','vino','claro'];
  v_client record;
  v_cal_id uuid;
  v_base   int;
  i        int;
  v_day    int;
begin
  for v_client in select id from clients loop
    -- Calendario del mes actual (se crea si no existe).
    select id into v_cal_id
      from calendars
      where client_id = v_client.id and month = v_month and year = v_year;
    if v_cal_id is null then
      insert into calendars (client_id, month, year)
        values (v_client.id, v_month, v_year)
        returning id into v_cal_id;
    end if;

    -- Si ya se sembró antes en este mes, no duplicar.
    if exists (select 1 from posts where calendar_id = v_cal_id and preview_text like 'Pieza %') then
      continue;
    end if;

    -- Las nuevas se agregan después de lo que ya haya (position).
    select coalesce(max(position), -1) + 1 into v_base from posts where calendar_id = v_cal_id;

    for i in 1..9 loop
      v_day := least(1 + (i - 1) * 3, 28);  -- 1,4,7,...,25 (tope 28 por meses cortos)
      insert into posts (
        calendar_id, tipo, objetivo, plataforma, estado, fase,
        position, publish_date, preview_bg, preview_text
      ) values (
        v_cal_id, 'imagen', 'marca', 'instagram', 'pendiente', 'borrador',
        v_base + (i - 1),
        make_date(v_year::int, v_month::int, v_day),
        v_colors[i],
        'Pieza ' || i
      );
    end loop;
  end loop;
end $$;
