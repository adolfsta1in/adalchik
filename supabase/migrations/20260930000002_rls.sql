-- Row Level Security: оба игрока читают всё общее, каждый пишет только своё.

alter table players       enable row level security;
alter table app_settings  enable row level security;
alter table scoring_rules enable row level security;
alter table month_goals   enable row level security;
alter table leads         enable row level security;
alter table objections    enable row level security;
alter table scripts       enable row level security;
alter table activities    enable row level security;
alter table score_ledger  enable row level security;

-- players: читают оба, правят только свой профиль и только безопасные поля
create policy players_select on players for select to authenticated using (is_player());
create policy players_update on players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on players from authenticated, anon;
grant update (name, timezone, region_label, avatar_color, off_days) on players to authenticated;

-- общие настройки: оба читают и меняют
create policy settings_select on app_settings for select to authenticated using (is_player());
create policy settings_update on app_settings for update to authenticated using (is_player()) with check (is_player());
create policy rules_select on scoring_rules for select to authenticated using (is_player());
create policy rules_update on scoring_rules for update to authenticated using (is_player()) with check (is_player());
revoke update on scoring_rules from authenticated;
grant update (points, usd_step, step_points, updated_at) on scoring_rules to authenticated;
create policy goals_all on month_goals for all to authenticated using (is_player()) with check (is_player());

-- лиды: общая база, удалять может только владелец
create policy leads_select on leads for select to authenticated using (is_player());
create policy leads_insert on leads for insert to authenticated with check (is_player());
create policy leads_update on leads for update to authenticated using (is_player()) with check (is_player());
create policy leads_delete on leads for delete to authenticated using (owner_id = current_player_id());

-- возражения и скрипты: пишет автор
create policy objections_select on objections for select to authenticated using (is_player());
create policy objections_insert on objections for insert to authenticated with check (author_id = current_player_id());
create policy objections_update on objections for update to authenticated using (author_id = current_player_id());
create policy scripts_select on scripts for select to authenticated using (is_player());
create policy scripts_insert on scripts for insert to authenticated with check (author_id = current_player_id());
create policy scripts_update on scripts for update to authenticated using (author_id = current_player_id());

-- действия: только свои; изменений и удалений нет — только undo_activity()
create policy activities_select on activities for select to authenticated using (is_player());
create policy activities_insert on activities for insert to authenticated with check (player_id = current_player_id());
revoke update, delete on activities from authenticated, anon;

-- журнал очков пишут только триггеры
create policy ledger_select on score_ledger for select to authenticated using (is_player());
revoke insert, update, delete on score_ledger from authenticated, anon;

-- функции, которые клиент может вызывать
revoke execute on function undo_activity(uuid) from public, anon;
grant execute on function undo_activity(uuid) to authenticated;

-- Realtime для живой ленты и счётчиков
alter publication supabase_realtime add table activities, score_ledger;

-- отчётные функции работают в обход RLS — только для вошедших игроков
revoke execute on function week_summary(date) from public, anon;
revoke execute on function month_progress(date) from public, anon;
revoke execute on function recompute_lead_status(uuid) from public, anon, authenticated;
grant execute on function week_summary(date), month_progress(date) to authenticated;
