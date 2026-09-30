-- ДЕМО-ДАННЫЕ за 3 прошедшие недели + текущую. Только для локальной разработки
-- (выполняется `supabase db reset`). НЕ запускайте на продакшене.

select setseed(0.42);

do $$
declare
  p record;
  i int;
  d int;
  n int;
  k int;
  lead_ids uuid[];
  lid uuid;
  day_start timestamptz;
  ts timestamptz;
  r float;
  t activity_type;
  industries_kg text[] := array['Ритейл','Логистика','Стоматология','Строительство','HoReCa','Образование'];
  industries_ke text[] := array['Real estate','Логистика','Клиники','Туризм','Финансы','Ритейл'];
  cities_kg text[] := array['Бишкек','Ош','Каракол'];
  cities_ke text[] := array['Nairobi','Mombasa','Kisumu'];
  inds text[];
  offers offer_type[] := array['website','automation','ai','mixed']::offer_type[];
  obj_ids uuid[];
  scr_ids uuid[];
  other uuid;
begin
  -- возражения и скрипты
  insert into objections (text, author_id)
  select x, (select id from players order by created_at limit 1)
  from unnest(array['Дорого','Нам не нужно','Уже есть подрядчик','Пришлите на почту','Нет времени']) x;
  select array_agg(id) into obj_ids from objections;

  for p in select * from players order by created_at loop
    insert into scripts (objection_id, text, author_id)
    select o, 'Скрипт ' || p.name || ': понимаю, давайте я покажу кейс за 10 минут', p.id
    from unnest(obj_ids[1:3]) o;
  end loop;

  for p in select * from players order by created_at loop
    inds := case when p.timezone = 'Asia/Bishkek' then industries_kg else industries_ke end;

    -- лиды
    for i in 1..90 loop
      insert into leads (owner_id, company, contact_name, phone, industry, city, created_at)
      values (p.id,
        (case when p.timezone = 'Asia/Bishkek' then 'ОсОО ' else '' end) ||
          initcap(substr(md5(random()::text), 1, 6)) ||
          (case when p.timezone = 'Asia/Bishkek' then '' else ' Ltd' end),
        'Контакт ' || i,
        case when p.timezone = 'Asia/Bishkek' then '+996 7' else '+254 7' end
          || lpad((floor(random() * 99999999))::text, 8, '0'),
        inds[1 + floor(random() * array_length(inds, 1))::int],
        (case when p.timezone = 'Asia/Bishkek' then cities_kg else cities_ke end)[1 + floor(random() * 3)::int],
        now() - interval '25 days');
    end loop;
    select array_agg(id order by random()) into lead_ids from leads where owner_id = p.id;
    select id into other from players where id <> p.id limit 1;

    -- 21 день назад … вчера
    for d in reverse 21..1 loop
      day_start := ((now() at time zone p.timezone)::date - d)::timestamp at time zone p.timezone;
      -- пропускаем нерабочие дни игрока
      continue when extract(isodow from day_start at time zone p.timezone)::smallint = any (p.off_days);
      n := 16 + floor(random() * 24)::int;  -- наборов за день
      for k in 1..n loop
        ts := day_start + interval '9 hours' + (random() * interval '8 hours');
        lid := lead_ids[1 + floor(random() * array_length(lead_ids, 1))::int];
        r := random();
        t := case when r < 0.55 then 'call' when r < 0.75 then 'conversation'
                  when r < 0.92 then 'rejection' when r < 0.97 then 'followup'
                  else 'meeting_set' end;
        insert into activities (player_id, lead_id, type, industry, offer, objection_id, script_id, created_at)
        values (p.id, case when t = 'call' and random() < 0.3 then null else lid end, t,
          null,
          case when t in ('conversation','rejection','meeting_set') then offers[1 + floor(random() * 4)::int] end,
          case when t = 'rejection' then obj_ids[1 + floor(random() * 5)::int] end,
          case when t = 'meeting_set' and random() < 0.4
               then (select id from scripts where author_id = other order by random() limit 1) end,
          ts);
      end loop;
    end loop;

    -- дальнейшие этапы воронки по части назначенных встреч
    for lid in select distinct a.lead_id from activities a
               where a.player_id = p.id and a.type = 'meeting_set' loop
      ts := (select max(created_at) from activities where lead_id = lid) + interval '2 days';
      continue when ts > now() or random() < 0.3;
      insert into activities (player_id, lead_id, type, offer, created_at)
      values (p.id, lid, 'meeting_held', offers[1 + floor(random() * 4)::int], ts);
      continue when random() < 0.4 or ts + interval '1 day' > now();
      insert into activities (player_id, lead_id, type, offer, created_at)
      values (p.id, lid, 'proposal', offers[1 + floor(random() * 4)::int], ts + interval '1 day');
      continue when random() < 0.6 or ts + interval '3 days' > now();
      insert into activities (player_id, lead_id, type, offer, deal_value, created_at)
      values (p.id, lid, 'deal', offers[1 + floor(random() * 4)::int],
              (500 + floor(random() * 30) * 100), ts + interval '3 days');
    end loop;
  end loop;

  -- цели недели и наказание за прошлую неделю
  insert into weekly_goals (player_id, week_start, target_points, target_meetings)
  select pl.id, w::date, 250 + floor(random() * 150)::int, 2
  from players pl, generate_series(date_trunc('week', now()) - interval '21 days', date_trunc('week', now()), interval '7 days') w;
  insert into penalties (week_start, text, set_by)
  values (date_trunc('week', now())::date - 7, 'Проигравший записывает видео-отзыв о победителе 🎬', (select id from players order by created_at limit 1));

  insert into month_goals (month, metric, target)
  values (date_trunc('month', now())::date, 'points', 3000)
  on conflict (month) do nothing;
end $$;
