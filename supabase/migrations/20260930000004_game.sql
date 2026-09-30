-- Этап 2: серии, квесты дня, достижения, Power Hour, сезоны, цели и наказания.

-- ─── Серии ─────────────────────────────────────────────────────────────────
-- День засчитывается, если наборов ≥ минимума. Нерабочий день (off_days) без
-- минимума серию не рвёт и не увеличивает. Сегодняшний незавершённый день тоже не рвёт.
create or replace function player_streak(p_player uuid)
returns table (current int, best int, today_dials int, today_done boolean, min_calls int)
language plpgsql stable security definer set search_path = public as $$
declare
  p players;
  mn int;
  today date;
  first_day date;
  d date;
  dl int;
  run int := 0;
  best_run int := 0;
  cur int := 0;
  broken boolean := false;
begin
  select * into p from players where id = p_player;
  select streak_min_calls into mn from app_settings;
  today := (now() at time zone p.timezone)::date;
  select min(local_date) into first_day from activities where player_id = p_player and voided_at is null;
  today_dials := 0;
  if first_day is null then
    return query select 0, 0, 0, false, mn;
    return;
  end if;

  -- проход вперёд по истории: лучшая серия
  for d, dl in
    select g::date, coalesce(x.dials, 0)::int
    from generate_series(greatest(first_day, today - 730), today, interval '1 day') g
    left join (
      select a.local_date, count(*) as dials from activities a
      where a.player_id = p_player and a.voided_at is null
        and a.type in ('call', 'conversation', 'rejection', 'meeting_set')
      group by 1
    ) x on x.local_date = g::date
    order by 1
  loop
    if dl >= mn then
      run := run + 1;
    elsif extract(isodow from d)::smallint = any (p.off_days) or d = today then
      null; -- не рвёт
    else
      run := 0;
    end if;
    best_run := greatest(best_run, run);
    if d = today then today_dials := dl; end if;
  end loop;
  cur := run;
  return query select cur, best_run, today_dials, today_dials >= mn, mn;
end $$;

-- ─── Квесты дня ────────────────────────────────────────────────────────────
create table quests (
  id          int primary key,
  title       text not null,
  description text not null,
  -- kind: count | same_industry | distinct_offers | before_hour
  kind        text not null check (kind in ('count', 'same_industry', 'distinct_offers', 'before_hour')),
  types       activity_type[] not null,
  target      int not null,
  hour_limit  int,
  active      boolean not null default true
);

insert into quests (id, title, description, kind, types, target, hour_limit) values
  (1,  'Отраслевой снайпер', 'Проведи 5 живых разговоров в одной отрасли', 'same_industry', '{conversation,rejection,meeting_set}', 5, null),
  (2,  'Двойной удар',       'Назначь 2 встречи',                           'count',         '{meeting_set}', 2, null),
  (3,  'Разогрев',           'Сделай 10 наборов до 11:00',                  'before_hour',   '{call,conversation,rejection,meeting_set}', 10, 11),
  (4,  'Болтун',             'Проведи 8 живых разговоров',                  'count',         '{conversation,rejection,meeting_set}', 8, null),
  (5,  'Стахановец',         'Сделай 40 наборов за день',                   'count',         '{call,conversation,rejection,meeting_set}', 40, null),
  (6,  'Три кита',           'Предложи 3 разных оффера в разговорах',       'distinct_offers', '{conversation,rejection,meeting_set}', 3, null),
  (7,  'Непробиваемый',      'Собери 6 отказов и не сдайся',                'count',         '{rejection}', 6, null),
  (8,  'Возвращенец',        'Сделай 5 фоллоу-апов',                        'count',         '{followup}', 5, null),
  (9,  'Первая за день',     'Назначь встречу до 13:00',                    'before_hour',   '{meeting_set}', 1, 13),
  (10, 'КП-машина',          'Отправь КП',                                  'count',         '{proposal}', 1, null);

-- Квест дня одинаков для обоих: выбирается детерминированно по дате
create or replace function quest_for_date(p_date date) returns quests
language sql stable set search_path = public as $$
  select q.* from quests q where q.active
  order by q.id
  offset (abs(hashtext('arena-' || p_date::text)) % greatest(1, (select count(*) from quests where active)))
  limit 1
$$;

create table quest_completions (
  player_id  uuid not null references players (id),
  quest_date date not null,
  quest_id   int not null references quests (id),
  ledger_id  bigint references score_ledger (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (player_id, quest_date)
);

create or replace function quest_progress(p_player uuid, p_date date)
returns table (quest_id int, title text, description text, progress int, target int, done boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  q quests;
  v int;
begin
  q := quest_for_date(p_date);
  if q.id is null then return; end if;
  if q.kind = 'count' then
    select count(*) into v from activities a
     where a.player_id = p_player and a.local_date = p_date and a.voided_at is null and a.type = any (q.types);
  elsif q.kind = 'before_hour' then
    select count(*) into v from activities a
     where a.player_id = p_player and a.local_date = p_date and a.voided_at is null and a.type = any (q.types)
       and a.local_hour < q.hour_limit;
  elsif q.kind = 'same_industry' then
    select coalesce(max(c), 0) into v from (
      select count(*) c from activities a
       where a.player_id = p_player and a.local_date = p_date and a.voided_at is null
         and a.type = any (q.types) and a.industry is not null
       group by lower(a.industry)) x;
  elsif q.kind = 'distinct_offers' then
    select count(distinct a.offer) into v from activities a
     where a.player_id = p_player and a.local_date = p_date and a.voided_at is null
       and a.type = any (q.types) and a.offer is not null;
  end if;
  return query select q.id, q.title, q.description, least(v, q.target), q.target, v >= q.target;
end $$;

-- Начислить или снять бонус квеста после изменения действий
create or replace function sync_quest(p_player uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
declare
  qp record;
  c quest_completions;
  lid bigint;
  bonus int;
begin
  select * into qp from quest_progress(p_player, p_date);
  if qp.quest_id is null then return; end if;
  select * into c from quest_completions where player_id = p_player and quest_date = p_date;
  if qp.done and c.player_id is null then
    select quest_bonus into bonus from app_settings;
    insert into score_ledger (player_id, source, points, local_date, week_start, meta)
    values (p_player, 'quest', bonus, p_date, date_trunc('week', p_date)::date,
            jsonb_build_object('quest_id', qp.quest_id, 'title', qp.title))
    returning id into lid;
    insert into quest_completions (player_id, quest_date, quest_id, ledger_id)
    values (p_player, p_date, qp.quest_id, lid);
  elsif not qp.done and c.player_id is not null then
    update score_ledger set voided = true where id = c.ledger_id;
    delete from quest_completions where player_id = p_player and quest_date = p_date;
  end if;
end $$;

-- ─── Достижения ────────────────────────────────────────────────────────────
create table achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null,
  sort        int not null default 0
);

insert into achievements (code, title, description, icon, sort) values
  ('first_blood', 'Первая кровь', 'Первая назначенная встреча',              '🩸', 1),
  ('armor',       'Броня',        '10 отказов за один день',                 '🛡️', 2),
  ('sniper',      'Снайпер',      'Встреча с первого звонка лиду',           '🎯', 3),
  ('marathon',    'Марафонец',    'Серия 10 дней',                           '🏃', 4),
  ('closer',      'Закрыватель',  'Первая сделка',                           '💰', 5),
  ('teacher',     'Учитель',      'Твой скрипт принёс брату встречу',        '🎓', 6);

create table player_achievements (
  player_id   uuid not null references players (id),
  code        text not null references achievements (code),
  activity_id uuid references activities (id) on delete set null,
  earned_at   timestamptz not null default now(),
  seen        boolean not null default false,
  primary key (player_id, code)
);

create or replace function grant_achievement(p_player uuid, p_code text, p_activity uuid) returns void
language sql security definer set search_path = public as $$
  insert into player_achievements (player_id, code, activity_id)
  values (p_player, p_code, p_activity)
  on conflict do nothing
$$;

create or replace function check_achievements(a activities) returns void
language plpgsql security definer set search_path = public as $$
declare
  author uuid;
begin
  if a.type = 'meeting_set' then
    perform grant_achievement(a.player_id, 'first_blood', a.id);
    -- «Снайпер»: до этой встречи по лиду не было действий (кроме этого же звонка, ≤ 15 мин)
    if a.lead_id is not null and not exists (
      select 1 from activities x where x.lead_id = a.lead_id and x.id <> a.id and x.voided_at is null
        and x.created_at < a.created_at - interval '15 minutes') then
      perform grant_achievement(a.player_id, 'sniper', a.id);
    end if;
    if a.script_id is not null then
      select author_id into author from scripts where id = a.script_id;
      if author is not null and author <> a.player_id then
        perform grant_achievement(author, 'teacher', a.id);
      end if;
    end if;
  elsif a.type = 'deal' then
    perform grant_achievement(a.player_id, 'closer', a.id);
  elsif a.type = 'rejection' then
    if (select count(*) from activities x where x.player_id = a.player_id and x.local_date = a.local_date
          and x.type = 'rejection' and x.voided_at is null) >= 10 then
      perform grant_achievement(a.player_id, 'armor', a.id);
    end if;
  end if;
  if a.type in ('call', 'conversation', 'rejection', 'meeting_set')
     and (select current from player_streak(a.player_id)) >= 10 then
    perform grant_achievement(a.player_id, 'marathon', a.id);
  end if;
end $$;

-- ─── Power Hour (блиц) ─────────────────────────────────────────────────────
create table blitz_sessions (
  id           uuid primary key default gen_random_uuid(),
  started_by   uuid not null references players (id),
  started_at   timestamptz not null default now(),
  ends_at      timestamptz not null default now() + interval '60 minutes',
  cancelled_at timestamptz
);

create table blitz_participants (
  blitz_id  uuid not null references blitz_sessions (id) on delete cascade,
  player_id uuid not null references players (id),
  joined_at timestamptz not null default now(),
  primary key (blitz_id, player_id)
);

alter table activities add column blitz_id uuid references blitz_sessions (id) on delete set null;
alter table activities add column multiplier numeric(4,2) not null default 1;

create or replace function active_blitz() returns blitz_sessions
language sql stable security definer set search_path = public as $$
  select * from blitz_sessions
  where cancelled_at is null and now() between started_at and ends_at
  order by started_at desc limit 1
$$;

create or replace function start_blitz() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_player_id();
  b blitz_sessions;
begin
  if me is null then raise exception 'forbidden'; end if;
  b := active_blitz();
  if b.id is null then
    insert into blitz_sessions (started_by) values (me) returning * into b;
  end if;
  insert into blitz_participants (blitz_id, player_id) values (b.id, me) on conflict do nothing;
  return b.id;
end $$;

create or replace function join_blitz(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_player_id();
begin
  if me is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from blitz_sessions where id = p_id and cancelled_at is null and now() < ends_at) then
    raise exception 'Блиц уже закончился';
  end if;
  insert into blitz_participants (blitz_id, player_id) values (p_id, me) on conflict do nothing;
end $$;

create or replace function stop_blitz(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update blitz_sessions set cancelled_at = now()
  where id = p_id and started_by = current_player_id() and cancelled_at is null;
end $$;

-- Счёт блица: очки за действия внутри сессии
create or replace function blitz_score(p_id uuid)
returns table (player_id uuid, points int, actions int, joined boolean)
language sql stable security definer set search_path = public as $$
  select p.id,
    coalesce((select sum(s.points) from score_ledger s join activities a on a.id = s.activity_id
              where a.blitz_id = p_id and s.player_id = p.id and s.source = 'activity' and not s.voided), 0)::int,
    (select count(*) from activities a where a.blitz_id = p_id and a.player_id = p.id and a.voided_at is null)::int,
    exists (select 1 from blitz_participants bp where bp.blitz_id = p_id and bp.player_id = p.id)
  from players p
$$;

-- ─── Цели недели и наказания ───────────────────────────────────────────────
create table weekly_goals (
  player_id     uuid not null references players (id) default current_player_id(),
  week_start    date not null check (extract(isodow from week_start) = 1),
  target_points int not null check (target_points > 0),
  target_meetings int not null default 0 check (target_meetings >= 0),
  created_at    timestamptz not null default now(),
  primary key (player_id, week_start)
);

create table penalties (
  week_start date primary key check (extract(isodow from week_start) = 1),
  text       text not null,
  set_by     uuid not null references players (id) default current_player_id(),
  created_at timestamptz not null default now()
);

-- ─── Сезоны (календарный месяц) ────────────────────────────────────────────
create or replace function season_summary(p_month date)
returns table (player_id uuid, name text, avatar_color text, points int, meetings int, deals int, deal_sum numeric,
               closed boolean, champion boolean)
language sql stable security definer set search_path = public as $$
  with m as (select p_month as s, (p_month + interval '1 month')::date as e),
  per as (
    select p.id, p.name, p.avatar_color,
      coalesce((select sum(l.points) from score_ledger l, m where l.player_id = p.id and not l.voided
                and l.local_date >= m.s and l.local_date < m.e), 0)::int as pts,
      (select count(*) from activities a, m where a.player_id = p.id and a.voided_at is null and a.type = 'meeting_set'
                and a.local_date >= m.s and a.local_date < m.e)::int as mt,
      (select count(*) from activities a, m where a.player_id = p.id and a.voided_at is null and a.type = 'deal'
                and a.local_date >= m.s and a.local_date < m.e)::int as dl,
      (select coalesce(sum(a.deal_value), 0) from activities a, m where a.player_id = p.id and a.voided_at is null
                and a.type = 'deal' and a.local_date >= m.s and a.local_date < m.e) as ds,
      (now() at time zone p.timezone)::date >= (select e from m) as cl
    from players p
  )
  select id, name, avatar_color, pts, mt, dl, ds,
    bool_and(cl) over (),
    pts > 0 and pts = max(pts) over () and count(*) over (partition by pts) = 1
  from per
  order by pts desc
$$;

create or replace function season_list()
returns table (month date, champion_id uuid, total int)
language sql stable security definer set search_path = public as $$
  select m::date,
    (select s.player_id from season_summary(m::date) s where s.champion and s.closed),
    (select coalesce(sum(s.points), 0)::int from season_summary(m::date) s)
  from generate_series(
    date_trunc('month', coalesce((select min(local_date) from score_ledger), current_date)),
    date_trunc('month', current_date), interval '1 month') m
  order by 1 desc
$$;

-- ─── Триггеры: множитель блица, квесты, достижения ─────────────────────────
create or replace function activities_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  loc record;
  b blitz_sessions;
  mult numeric;
begin
  if auth.uid() is not null then
    new.player_id  := current_player_id();
    new.created_at := now();
    if new.player_id is null then
      raise exception 'Нет профиля игрока';
    end if;
  end if;
  new.voided_at := null;
  new.void_kind := null;
  new.blitz_id  := null;
  new.multiplier := 1;

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

  if new.industry is null and new.lead_id is not null then
    select industry into new.industry from leads where id = new.lead_id;
  end if;

  select * into loc from player_local(new.player_id, new.created_at);
  new.local_date := loc.local_date;
  new.week_start := loc.week_start;
  new.local_hour := loc.local_hour;
  new.points     := calc_points(new.type, new.deal_value);

  -- Power Hour: ×множитель, если игрок участвует в идущем блице
  select s.* into b from blitz_sessions s join blitz_participants bp on bp.blitz_id = s.id
   where bp.player_id = new.player_id and s.cancelled_at is null
     and new.created_at between greatest(s.started_at, bp.joined_at) and s.ends_at
   order by s.started_at desc limit 1;
  if b.id is not null then
    select blitz_multiplier into mult from app_settings;
    new.blitz_id := b.id;
    new.multiplier := mult;
    new.points := round(new.points * mult)::int;
  end if;
  return new;
end $$;

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

  perform sync_quest(new.player_id, new.local_date);
  perform check_achievements(new);
  return new;
end $$;

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

  if a.type = 'meeting_set' and exists (
    select 1 from activities where lead_id = a.lead_id and type = 'meeting_held'
      and voided_at is null)
    and (select count(*) from activities where lead_id = a.lead_id and type = 'meeting_set'
           and voided_at is null) = 1 then
    raise exception 'Сначала отмените проведённую встречу по этому лиду';
  end if;

  update activities set voided_at = now(), void_kind = kind where id = p_id;
  update score_ledger set voided = true where activity_id = p_id;
  delete from player_achievements where activity_id = p_id;
  if a.lead_id is not null then
    perform recompute_lead_status(a.lead_id);
  end if;
  perform sync_quest(a.player_id, a.local_date);
  return kind;
end $$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table quests              enable row level security;
alter table quest_completions   enable row level security;
alter table achievements        enable row level security;
alter table player_achievements enable row level security;
alter table blitz_sessions      enable row level security;
alter table blitz_participants  enable row level security;
alter table weekly_goals        enable row level security;
alter table penalties           enable row level security;

create policy quests_select on quests for select to authenticated using (is_player());
create policy qc_select on quest_completions for select to authenticated using (is_player());
create policy ach_select on achievements for select to authenticated using (is_player());
create policy pa_select on player_achievements for select to authenticated using (is_player());
create policy pa_update on player_achievements for update to authenticated
  using (player_id = current_player_id()) with check (player_id = current_player_id());
revoke insert, update, delete on player_achievements from authenticated, anon;
grant update (seen) on player_achievements to authenticated;
create policy blitz_select on blitz_sessions for select to authenticated using (is_player());
create policy bp_select on blitz_participants for select to authenticated using (is_player());
revoke insert, update, delete on blitz_sessions, blitz_participants from authenticated, anon;

create policy wg_select on weekly_goals for select to authenticated using (is_player());
create policy wg_insert on weekly_goals for insert to authenticated with check (player_id = current_player_id());
create policy wg_update on weekly_goals for update to authenticated
  using (player_id = current_player_id()) with check (player_id = current_player_id());
create policy pen_select on penalties for select to authenticated using (is_player());
create policy pen_write on penalties for insert to authenticated with check (is_player());
create policy pen_update on penalties for update to authenticated using (is_player()) with check (is_player());

revoke execute on function player_streak(uuid), quest_progress(uuid, date), sync_quest(uuid, date),
  grant_achievement(uuid, text, uuid), check_achievements(activities), start_blitz(), join_blitz(uuid),
  stop_blitz(uuid), blitz_score(uuid), season_summary(date), season_list(), active_blitz()
  from public, anon;
grant execute on function player_streak(uuid), quest_progress(uuid, date), start_blitz(), join_blitz(uuid),
  stop_blitz(uuid), blitz_score(uuid), season_summary(date), season_list(), active_blitz()
  to authenticated;

alter publication supabase_realtime add table blitz_sessions, blitz_participants, player_achievements;
