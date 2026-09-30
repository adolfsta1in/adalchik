-- Этап 3: аналитика и обучение. Все функции — по неотменённым действиям за период
-- [p_from, p_to] в локальных датах игроков.

-- Сумма КП тоже учитывается в денежной воронке
alter table activities drop constraint activities_deal_value_only;
alter table activities add constraint activities_value_only check (type in ('deal', 'proposal') or deal_value is null);

-- Воронка по игроку: набор → разговор → встреча → проведённая → КП → сделка
create or replace function funnel(p_from date, p_to date)
returns table (player_id uuid, dials int, talks int, meetings_set int, meetings_held int,
               proposals int, deals int, proposal_sum numeric, deal_sum numeric)
language sql stable security definer set search_path = public as $$
  select p.id,
    count(a.*) filter (where a.type in ('call', 'conversation', 'rejection', 'meeting_set'))::int,
    count(a.*) filter (where a.type in ('conversation', 'rejection', 'meeting_set'))::int,
    count(a.*) filter (where a.type = 'meeting_set')::int,
    count(a.*) filter (where a.type = 'meeting_held')::int,
    count(a.*) filter (where a.type = 'proposal')::int,
    count(a.*) filter (where a.type = 'deal')::int,
    coalesce(sum(a.deal_value) filter (where a.type = 'proposal'), 0),
    coalesce(sum(a.deal_value) filter (where a.type = 'deal'), 0)
  from players p
  left join activities a on a.player_id = p.id and a.voided_at is null
    and a.local_date between p_from and p_to
  group by p.id
$$;

-- Разрезы «отрасль × оффер» по регионам: конверсия живого разговора во встречу
create or replace function segment_stats(p_from date, p_to date)
returns table (region text, industry text, offer offer_type, talks int, meetings int, conv numeric)
language sql stable security definer set search_path = public as $$
  select p.region_label, coalesce(nullif(a.industry, ''), '—'), a.offer,
    count(*)::int,
    count(*) filter (where a.type = 'meeting_set')::int,
    round(count(*) filter (where a.type = 'meeting_set')::numeric / nullif(count(*), 0), 3)
  from activities a join players p on p.id = a.player_id
  where a.voided_at is null and a.local_date between p_from and p_to
    and a.type in ('conversation', 'rejection', 'meeting_set')
  group by 1, 2, 3
$$;

-- «Что работает»: топ-3 комбинации в каждом регионе (минимум p_min разговоров;
-- сглаживание Лапласа, чтобы 1 из 1 не обгонял 6 из 20)
create or replace function what_works(p_from date, p_to date, p_min int default 3)
returns table (region text, industry text, offer offer_type, talks int, meetings int, conv numeric, rank int)
language sql stable security definer set search_path = public as $$
  select * from (
    select s.region, s.industry, s.offer, s.talks, s.meetings, s.conv,
      row_number() over (partition by s.region
        order by (s.meetings + 1.0) / (s.talks + 5.0) desc, s.meetings desc)::int as rank
    from segment_stats(p_from, p_to) s
    where s.talks >= p_min and s.meetings > 0
  ) x where x.rank <= 3
  order by region, rank
$$;

-- Тепловая карта: день недели × час (локальное время игрока), конверсия набора в разговор
create or replace function hour_heatmap(p_from date, p_to date)
returns table (player_id uuid, dow int, hour int, dials int, talks int)
language sql stable security definer set search_path = public as $$
  select a.player_id, extract(isodow from a.local_date)::int, a.local_hour::int,
    count(*)::int,
    count(*) filter (where a.type in ('conversation', 'rejection', 'meeting_set'))::int
  from activities a
  where a.voided_at is null and a.local_date between p_from and p_to
    and a.type in ('call', 'conversation', 'rejection', 'meeting_set')
  group by 1, 2, 3
$$;

-- Возражения: как часто встречаются (по регионам)
create or replace function objection_stats(p_from date, p_to date)
returns table (objection_id uuid, text text, total int, per_region jsonb, scripts int)
language sql stable security definer set search_path = public as $$
  with hits as (
    select a.objection_id, p.region_label
    from activities a join players p on p.id = a.player_id
    where a.voided_at is null and a.objection_id is not null and a.local_date between p_from and p_to
  )
  select o.id, o.text,
    (select count(*) from hits h where h.objection_id = o.id)::int,
    coalesce((select jsonb_object_agg(r.region_label, r.c) from
      (select h.region_label, count(*) c from hits h where h.objection_id = o.id group by 1) r), '{}'),
    (select count(*) from scripts s where s.objection_id = o.id)::int
  from objections o
  order by 3 desc, o.created_at
$$;

-- Скрипты: сколько раз применяли и сколько раз это закончилось встречей
create or replace function script_stats(p_from date, p_to date)
returns table (script_id uuid, uses int, meetings int, conv numeric)
language sql stable security definer set search_path = public as $$
  select s.id,
    count(a.*)::int,
    count(a.*) filter (where a.type = 'meeting_set')::int,
    round(count(a.*) filter (where a.type = 'meeting_set')::numeric / nullif(count(a.*), 0), 3)
  from scripts s
  left join activities a on a.script_id = s.id and a.voided_at is null
    and a.local_date between p_from and p_to
  group by s.id
$$;

revoke execute on function funnel(date, date), segment_stats(date, date), what_works(date, date, int),
  hour_heatmap(date, date), objection_stats(date, date), script_stats(date, date) from public, anon;
grant execute on function funnel(date, date), segment_stats(date, date), what_works(date, date, int),
  hour_heatmap(date, date), objection_stats(date, date), script_stats(date, date) to authenticated;
