-- Cold Call Arena — ядро: игроки, лиды, действия, очки.
-- Все «дни» и «недели» считаются по часовому поясу игрока на момент записи.

create extension if not exists pgcrypto;

-- ─── Типы ──────────────────────────────────────────────────────────────────
create type activity_type as enum (
  'call', 'conversation', 'rejection', 'meeting_set',
  'meeting_held', 'proposal', 'deal', 'followup'
);
create type lead_status as enum (
  'new', 'contacted', 'meeting_set', 'meeting_held', 'proposal', 'won', 'lost'
);
create type offer_type as enum ('website', 'automation', 'ai', 'mixed');

-- ─── Игроки ────────────────────────────────────────────────────────────────
create table players (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete set null,
  name             text not null,
  email            text not null unique check (email = lower(email)),
  timezone         text not null default 'Asia/Bishkek',
  region_label     text not null default '',
  avatar_color     text not null default '#f97316',
  -- ISO-дни недели (1 = пн … 7 = вс), которые игрок отметил как нерабочие
  off_days         smallint[] not null default '{6,7}',
  created_at       timestamptz not null default now()
);

create or replace function validate_player_tz() returns trigger
language plpgsql as $$
begin
  perform now() at time zone new.timezone;  -- бросит ошибку для неизвестного пояса
  return new;
end $$;

create trigger players_validate_tz
  before insert or update of timezone on players
  for each row execute function validate_player_tz();

create or replace function current_player_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from players where user_id = auth.uid()
$$;

create or replace function is_player() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where user_id = auth.uid())
$$;

-- Второй уровень whitelist: создать пользователя можно только для email из players.
create or replace function link_auth_user_to_player() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update players set user_id = new.id where email = lower(new.email);
  if not found then
    raise exception 'Email % не в списке игроков', new.email;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_auth_user_to_player();

-- ─── Настройки ─────────────────────────────────────────────────────────────
create table app_settings (
  id                  boolean primary key default true check (id),
  streak_min_calls    int not null default 20 check (streak_min_calls > 0),
  undo_window_minutes int not null default 10 check (undo_window_minutes >= 0),
  script_bonus        int not null default 5,
  quest_bonus         int not null default 15,
  blitz_multiplier    numeric(4,2) not null default 2,
  updated_at          timestamptz not null default now()
);
insert into app_settings default values;

create table scoring_rules (
  type        activity_type primary key,
  label       text not null,
  points      int not null,
  -- надбавка за сумму: step_points очков за каждые usd_step долларов
  usd_step    int check (usd_step is null or usd_step > 0),
  step_points int not null default 0,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);

insert into scoring_rules (type, label, points, usd_step, step_points, sort) values
  ('call',         'Звонок без ответа', 1,   null, 0, 1),
  ('conversation', 'Разговор',          3,   null, 0, 2),
  ('rejection',    'Отказ',             2,   null, 0, 3),
  ('followup',     'Фоллоу-ап',         1,   null, 0, 4),
  ('meeting_set',  'Встреча назначена', 10,  null, 0, 5),
  ('meeting_held', 'Встреча проведена', 10,  null, 0, 6),
  ('proposal',     'КП отправлено',     25,  null, 0, 7),
  ('deal',         'Сделка',            100, 100,  1, 8);

-- Общая цель месяца (оба игрока вместе)
create table month_goals (
  month      date primary key check (extract(day from month) = 1),
  metric     text not null default 'points' check (metric in ('points', 'meetings')),
  target     int not null check (target > 0),
  updated_at timestamptz not null default now()
);

-- ─── Лиды ──────────────────────────────────────────────────────────────────
create table leads (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references players (id) default current_player_id(),
  company          text not null check (length(trim(company)) > 0),
  contact_name     text,
  phone            text,
  industry         text,
  city             text,
  status           lead_status not null default 'new',
  notes            text,
  import_batch     uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_activity_at timestamptz
);
create index leads_owner_status_idx on leads (owner_id, status);
create index leads_last_activity_idx on leads (last_activity_at desc nulls last);
create index leads_phone_idx on leads (regexp_replace(coalesce(phone, ''), '\D', '', 'g'));

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger leads_touch before update on leads
  for each row execute function touch_updated_at();

-- ─── Возражения и скрипты ──────────────────────────────────────────────────
create table objections (
  id         uuid primary key default gen_random_uuid(),
  text       text not null unique,
  author_id  uuid not null references players (id) default current_player_id(),
  created_at timestamptz not null default now()
);

create table scripts (
  id           uuid primary key default gen_random_uuid(),
  objection_id uuid not null references objections (id) on delete cascade,
  text         text not null,
  author_id    uuid not null references players (id) default current_player_id(),
  created_at   timestamptz not null default now()
);

-- ─── Действия ──────────────────────────────────────────────────────────────
create table activities (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players (id) default current_player_id(),
  lead_id      uuid references leads (id) on delete restrict,
  type         activity_type not null,
  industry     text,
  offer        offer_type,
  deal_value   numeric(12,2) check (deal_value is null or deal_value >= 0),
  objection_id uuid references objections (id) on delete set null,
  script_id    uuid references scripts (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now(),
  -- заполняются триггером по часовому поясу игрока
  local_date   date not null default current_date,
  week_start   date not null default current_date,
  local_hour   smallint not null default 0,
  points       int not null default 0,
  voided_at    timestamptz,
  void_kind    text check (void_kind in ('undo', 'late')),
  constraint activities_lead_required check (lead_id is not null or type = 'call'),
  constraint activities_deal_value_only check (type = 'deal' or deal_value is null)
);
create index activities_player_date_idx on activities (player_id, local_date);
create index activities_player_week_idx on activities (player_id, week_start);
create index activities_lead_idx on activities (lead_id, created_at);
create index activities_created_idx on activities (created_at desc);

-- Журнал очков: единственный источник для счёта.
create table score_ledger (
  id          bigserial primary key,
  player_id   uuid not null references players (id),
  activity_id uuid references activities (id) on delete cascade,
  source      text not null check (source in ('activity', 'script_bonus', 'quest', 'manual')),
  points      int not null,
  local_date  date not null,
  week_start  date not null,
  meta        jsonb not null default '{}',
  voided      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index score_ledger_player_week_idx on score_ledger (player_id, week_start) where not voided;
create index score_ledger_player_date_idx on score_ledger (player_id, local_date) where not voided;

-- ─── Функции очков и статусов ──────────────────────────────────────────────
create or replace function calc_points(p_type activity_type, p_deal_value numeric)
returns int language sql stable set search_path = public as $$
  select coalesce(
    (select r.points
       + case when r.usd_step is not null and p_deal_value is not null
              then floor(p_deal_value / r.usd_step)::int * r.step_points
              else 0 end
     from scoring_rules r where r.type = p_type), 0)
$$;

-- Локальные дата/неделя/час игрока для момента времени
create or replace function player_local(p_player uuid, p_at timestamptz,
  out local_date date, out week_start date, out local_hour smallint)
language sql stable set search_path = public as $$
  select (p_at at time zone p.timezone)::date,
         date_trunc('week', p_at at time zone p.timezone)::date,
         extract(hour from p_at at time zone p.timezone)::smallint
  from players p where p.id = p_player
$$;

create or replace function lead_status_rank(s lead_status) returns int
language sql immutable as $$
  select case s when 'new' then 0 when 'contacted' then 1 when 'meeting_set' then 2
    when 'meeting_held' then 3 when 'proposal' then 4 when 'won' then 5 else -1 end
$$;

-- Следующий статус лида после действия (переходы только вперёд;
-- отказ переводит в lost, а любое продвижение возвращает лид из lost).
create or replace function next_lead_status(cur lead_status, t activity_type)
returns lead_status language plpgsql immutable as $$
declare
  target lead_status;
begin
  target := case t
    when 'call'         then 'contacted'
    when 'conversation' then 'contacted'
    when 'followup'     then 'contacted'
    when 'rejection'    then 'lost'
    when 'meeting_set'  then 'meeting_set'
    when 'meeting_held' then 'meeting_held'
    when 'proposal'     then 'proposal'
    when 'deal'         then 'won'
  end;
  if cur = 'won' then return cur; end if;
  if target = 'lost' then return 'lost'; end if;
  if cur = 'lost' then
    return case when t in ('call', 'followup') then cur else target end;
  end if;
  if lead_status_rank(target) > lead_status_rank(cur) then return target; end if;
  return cur;
end $$;

-- Пересчёт статуса лида по всем неотменённым действиям (нужен после отмены)
create or replace function recompute_lead_status(p_lead uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  s lead_status := 'new';
  a record;
begin
  for a in select type from activities
           where lead_id = p_lead and voided_at is null order by created_at loop
    s := next_lead_status(s, a.type);
  end loop;
  update leads set status = s,
    last_activity_at = (select max(created_at) from activities
                        where lead_id = p_lead and voided_at is null)
  where id = p_lead;
end $$;

create or replace function activities_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  loc record;
begin
  -- Через API игрок пишет только от своего имени и «сейчас».
  if auth.uid() is not null then
    new.player_id  := current_player_id();
    new.created_at := now();
    if new.player_id is null then
      raise exception 'Нет профиля игрока';
    end if;
  end if;
  new.voided_at := null;
  new.void_kind := null;

  if new.type = 'meeting_held' and not exists (
    select 1 from activities
    where lead_id = new.lead_id and type = 'meeting_set' and voided_at is null
  ) then
    raise exception 'Нельзя провести встречу, которая не была назначена'
      using errcode = 'P0001', hint = 'meeting_held_requires_meeting_set';
  end if;

  if new.type = 'deal' and new.deal_value is null then
    new.deal_value := 0;
  end if;

  -- Отрасль по умолчанию берём из лида
  if new.industry is null and new.lead_id is not null then
    select industry into new.industry from leads where id = new.lead_id;
  end if;

  select * into loc from player_local(new.player_id, new.created_at);
  new.local_date := loc.local_date;
  new.week_start := loc.week_start;
  new.local_hour := loc.local_hour;
  new.points     := calc_points(new.type, new.deal_value);
  return new;
end $$;

create trigger activities_before_insert
  before insert on activities
  for each row execute function activities_before_insert();

create or replace function activities_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  bonus int;
  loc record;
begin
  insert into score_ledger (player_id, activity_id, source, points, local_date, week_start, created_at)
  values (new.player_id, new.id, 'activity', new.points, new.local_date, new.week_start, new.created_at);

  if new.lead_id is not null then
    update leads
       set status = next_lead_status(status, new.type),
           last_activity_at = greatest(coalesce(last_activity_at, new.created_at), new.created_at)
     where id = new.lead_id;
  end if;

  -- Бонус автору скрипта, если скрипт брата помог назначить встречу
  if new.type = 'meeting_set' and new.script_id is not null then
    select author_id into author from scripts where id = new.script_id;
    if author is not null and author <> new.player_id then
      select script_bonus into bonus from app_settings;
      select * into loc from player_local(author, new.created_at);
      insert into score_ledger (player_id, activity_id, source, points, local_date, week_start, meta, created_at)
      values (author, new.id, 'script_bonus', bonus, loc.local_date, loc.week_start,
              jsonb_build_object('script_id', new.script_id, 'from_player', new.player_id), new.created_at);
    end if;
  end if;
  return new;
end $$;

create trigger activities_after_insert
  after insert on activities
  for each row execute function activities_after_insert();

-- Отмена: в течение окна — «тихая» (undo), позже — с пометкой в ленте (late).
create or replace function undo_activity(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  a activities;
  win int;
  kind text;
begin
  select * into a from activities
   where id = p_id and player_id = current_player_id() and voided_at is null
   for update;
  if not found then
    raise exception 'Действие не найдено или уже отменено';
  end if;

  select undo_window_minutes into win from app_settings;
  kind := case when now() - a.created_at <= make_interval(mins => win) then 'undo' else 'late' end;

  -- нельзя отменить назначение встречи, если по ней уже есть проведённая
  if a.type = 'meeting_set' and exists (
    select 1 from activities where lead_id = a.lead_id and type = 'meeting_held'
      and voided_at is null)
    and (select count(*) from activities where lead_id = a.lead_id and type = 'meeting_set'
           and voided_at is null) = 1 then
    raise exception 'Сначала отмените проведённую встречу по этому лиду';
  end if;

  update activities set voided_at = now(), void_kind = kind where id = p_id;
  update score_ledger set voided = true where activity_id = p_id;
  if a.lead_id is not null then
    perform recompute_lead_status(a.lead_id);
  end if;
  return kind;
end $$;

-- ─── Представления и отчёты ────────────────────────────────────────────────
-- «Набор» = любое действие, которое является результатом звонка.
create or replace view v_daily_stats with (security_invoker = true) as
with a as (
  select player_id, local_date, week_start,
    count(*) filter (where type in ('call', 'conversation', 'rejection', 'meeting_set')) as dials,
    count(*) filter (where type in ('conversation', 'rejection', 'meeting_set'))         as talks,
    count(*) filter (where type = 'rejection')    as rejections,
    count(*) filter (where type = 'meeting_set')  as meetings_set,
    count(*) filter (where type = 'meeting_held') as meetings_held,
    count(*) filter (where type = 'proposal')     as proposals,
    count(*) filter (where type = 'deal')         as deals,
    coalesce(sum(deal_value) filter (where type = 'deal'), 0) as deal_sum
  from activities where voided_at is null
  group by 1, 2, 3
), l as (
  select player_id, local_date, week_start, sum(points)::int as points
  from score_ledger where not voided group by 1, 2, 3
)
select coalesce(a.player_id, l.player_id)   as player_id,
       coalesce(a.local_date, l.local_date) as local_date,
       coalesce(a.week_start, l.week_start) as week_start,
       coalesce(a.dials, 0) as dials, coalesce(a.talks, 0) as talks,
       coalesce(a.rejections, 0) as rejections,
       coalesce(a.meetings_set, 0) as meetings_set,
       coalesce(a.meetings_held, 0) as meetings_held,
       coalesce(a.proposals, 0) as proposals, coalesce(a.deals, 0) as deals,
       coalesce(a.deal_sum, 0) as deal_sum,
       coalesce(l.points, 0) as points
from a full join l on a.player_id = l.player_id and a.local_date = l.local_date;

create or replace view v_weekly_scores with (security_invoker = true) as
select player_id, week_start, sum(points)::int as points
from score_ledger where not voided
group by 1, 2;

-- Текущие локальные дата/неделя каждого игрока
create or replace function player_today(p_player uuid)
returns table (local_date date, week_start date)
language sql stable set search_path = public as $$
  select l.local_date, l.week_start from player_local(p_player, now()) l
$$;

-- Итог недели. week_start — понедельник; у каждого игрока это его локальная неделя.
-- «Рост» = очки недели / среднее за до 4 предыдущих недель (с первой активной недели игрока).
-- Меньше 2 предыдущих недель → калибровка, «Рост» не присуждается никому.
create or replace function week_summary(p_week date)
returns table (
  player_id uuid, name text, avatar_color text, region_label text,
  points int, prev_weeks int, prev_avg numeric, growth numeric,
  calibrating boolean, week_closed boolean,
  volume_winner boolean, growth_winner boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_player() and auth.uid() is not null then
    raise exception 'forbidden';
  end if;
  return query
  with base as (
    select p.id, p.name, p.avatar_color, p.region_label,
      coalesce((select sum(s.points) from score_ledger s
                where s.player_id = p.id and s.week_start = p_week and not s.voided), 0)::int as pts,
      (select min(s.week_start) from score_ledger s where s.player_id = p.id and not s.voided) as first_week,
      (select l.week_start from player_local(p.id, now()) l) as cur_week
    from players p
  ), hist as (
    select b.*,
      greatest(0, least(4, ((p_week - coalesce(b.first_week, p_week)) / 7)))::int as n_prev
    from base b
  ), calc as (
    select h.*,
      case when h.n_prev > 0 then
        (select coalesce(sum(s.points), 0) from score_ledger s
          where s.player_id = h.id and not s.voided
            and s.week_start >= p_week - 7 * h.n_prev and s.week_start < p_week)::numeric / h.n_prev
      end as avg_prev
    from hist h
  ), g as (
    select c.*,
      c.n_prev < 2 as calib,
      case when c.n_prev >= 2 and c.avg_prev > 0 then round(c.pts / c.avg_prev, 3) end as gr
    from calc c
  )
  select g.id, g.name, g.avatar_color, g.region_label, g.pts, g.n_prev,
    round(g.avg_prev, 1), g.gr, g.calib,
    (p_week < g.cur_week),
    (g.pts > 0 and g.pts = (select max(pts) from g)
       and (select count(*) from g g2 where g2.pts = g.pts) = 1),
    (g.gr is not null and not exists (select 1 from g g2 where g2.gr is null)
       and g.gr = (select max(gr) from g)
       and (select count(*) from g g2 where g2.gr = g.gr) = 1)
  from g
  order by g.pts desc;
end $$;

-- Прогресс общей цели месяца (месяц — по локальной дате каждого игрока)
create or replace function month_progress(p_month date)
returns table (metric text, target int, total int, per_player jsonb)
language sql stable security definer set search_path = public as $$
  with goal as (
    select coalesce(g.metric, 'points') as metric, coalesce(g.target, 0) as target
    from (select 1) x left join month_goals g on g.month = p_month
  ), per as (
    select p.id,
      case (select metric from goal)
        when 'meetings' then (select count(*) from activities a
          where a.player_id = p.id and a.voided_at is null and a.type = 'meeting_set'
            and a.local_date >= p_month and a.local_date < (p_month + interval '1 month')::date)
        else (select coalesce(sum(s.points), 0) from score_ledger s
          where s.player_id = p.id and not s.voided
            and s.local_date >= p_month and s.local_date < (p_month + interval '1 month')::date)
      end::int as v
    from players p
  )
  select goal.metric, goal.target,
    (select coalesce(sum(v), 0)::int from per),
    (select coalesce(jsonb_object_agg(id, v), '{}') from per)
  from goal
$$;
