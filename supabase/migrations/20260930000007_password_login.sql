-- Вход по email + паролю. Пароль можно задать один раз (через сервер с service role),
-- дальше — только обычный вход. Сброс — в Supabase → Authentication → Users.
alter table players add column password_set boolean not null default false;

-- Флаг меняет только сервер; клиенту поле недоступно для записи (колоночные гранты из 0002).
