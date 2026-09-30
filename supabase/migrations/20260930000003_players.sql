-- Два игрока. Часовой пояс, регион и цвет каждый может поменять в профиле.
insert into players (name, email, timezone, region_label, avatar_color) values
  ('Адис',   'sa13367@auca.kg',       'Asia/Bishkek',   'Бишкек', '#f97316'),
  ('Алинур', 'alinur2003m@gmail.com', 'Africa/Nairobi', 'Найроби', '#0ea5e9')
on conflict (email) do nothing;

-- Если пользователи уже существовали до миграции — привязать их
update players p set user_id = u.id
from auth.users u
where lower(u.email) = p.email and p.user_id is null;
