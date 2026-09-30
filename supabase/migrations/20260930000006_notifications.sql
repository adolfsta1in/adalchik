-- Этап 4 (внутри сайта): уведомления сопернику о встречах, сделках, достижениях,
-- обгоне в счёте недели и приглашении на блиц. Доставляются через Realtime.

create table notifications (
  id          bigserial primary key,
  player_id   uuid not null references players (id),   -- получатель
  actor_id    uuid references players (id),
  kind        text not null check (kind in ('meeting', 'deal', 'achievement', 'overtake', 'blitz', 'proposal')),
  title       text not null,
  body        text,
  link        text,
  activity_id uuid references activities (id) on delete cascade,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index notifications_player_idx on notifications (player_id, created_at desc);

create or replace function rival_of(p_player uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from players where id <> p_player order by created_at limit 1
$$;

create or replace function notify(p_to uuid, p_actor uuid, p_kind text, p_title text,
  p_body text default null, p_link text default null, p_activity uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into notifications (player_id, actor_id, kind, title, body, link, activity_id)
  select p_to, p_actor, p_kind, p_title, p_body, p_link, p_activity
  where p_to is not null
$$;

-- Встречи, КП, сделки
create or replace function notify_on_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor players;
  company text;
begin
  if new.type not in ('meeting_set', 'meeting_held', 'proposal', 'deal') then return new; end if;
  select * into actor from players where id = new.player_id;
  select l.company into company from leads l where l.id = new.lead_id;
  perform notify(rival_of(new.player_id), new.player_id,
    case new.type when 'deal' then 'deal' when 'proposal' then 'proposal' else 'meeting' end,
    actor.name || case new.type
      when 'meeting_set'  then ' назначил встречу'
      when 'meeting_held' then ' провёл встречу'
      when 'proposal'     then ' отправил КП'
      when 'deal'         then ' закрыл сделку на $' || to_char(new.deal_value, 'FM999G999G999')
    end,
    coalesce(company, '') || ' · +' || new.points || ' оч.',
    '/', new.id);
  return new;
end $$;

create trigger activities_notify after insert on activities
  for each row execute function notify_on_activity();

-- Отмена действия убирает и уведомление о нём
create or replace function unnotify_on_void() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.voided_at is not null and old.voided_at is null then
    delete from notifications where activity_id = new.id;
  end if;
  return new;
end $$;

create trigger activities_unnotify after update of voided_at on activities
  for each row execute function unnotify_on_void();

-- Обгон в счёте недели (у каждого — его текущая локальная неделя)
create or replace function notify_on_overtake() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rival uuid := rival_of(new.player_id);
  mine int;
  theirs int;
  actor players;
begin
  if rival is null or new.voided or new.points <= 0 then return new; end if;
  if new.week_start <> (select week_start from player_local(new.player_id, now())) then return new; end if;
  select coalesce(sum(points), 0) into mine from score_ledger
   where player_id = new.player_id and week_start = new.week_start and not voided;
  select coalesce(sum(points), 0) into theirs from score_ledger
   where player_id = rival and not voided
     and week_start = (select week_start from player_local(rival, now()));
  if mine > theirs and mine - new.points <= theirs then
    select * into actor from players where id = new.player_id;
    perform notify(rival, new.player_id, 'overtake', actor.name || ' обогнал тебя в счёте недели',
      mine || ' : ' || theirs || '. Пора звонить!', '/call');
  end if;
  return new;
end $$;

create trigger score_ledger_overtake after insert on score_ledger
  for each row execute function notify_on_overtake();

-- Достижения
create or replace function notify_on_achievement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a achievements;
  actor players;
begin
  select * into a from achievements where code = new.code;
  select * into actor from players where id = new.player_id;
  perform notify(rival_of(new.player_id), new.player_id, 'achievement',
    actor.name || ' получил «' || a.title || '»', a.description, '/achievements');
  return new;
end $$;

create trigger player_achievements_notify after insert on player_achievements
  for each row execute function notify_on_achievement();

-- Приглашение на блиц
create or replace function notify_on_blitz() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor players;
begin
  select * into actor from players where id = new.started_by;
  perform notify(rival_of(new.started_by), new.started_by, 'blitz',
    actor.name || ' запустил Power Hour', '60 минут, все очки ×2. Присоединяйся!', '/blitz');
  return new;
end $$;

create trigger blitz_notify after insert on blitz_sessions
  for each row execute function notify_on_blitz();

-- RLS: каждый видит только свои уведомления и может лишь отметить прочитанным
alter table notifications enable row level security;
create policy notifications_select on notifications for select to authenticated
  using (player_id = current_player_id());
create policy notifications_update on notifications for update to authenticated
  using (player_id = current_player_id()) with check (player_id = current_player_id());
revoke insert, update, delete on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;

revoke execute on function notify(uuid, uuid, text, text, text, text, uuid), rival_of(uuid) from public, anon, authenticated;

alter publication supabase_realtime add table notifications;
