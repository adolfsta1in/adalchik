"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

function allowed(email: string) {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email);
}

export async function signInWithPassword(rawEmail: string, password: string): Promise<Result> {
  const email = rawEmail.trim().toLowerCase();
  if (!allowed(email)) return { ok: false, error: "Этот email не в списке игроков арены." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Неверный email или пароль. Первый раз? Задайте пароль на второй вкладке." };
  return { ok: true };
}

/** Первый вход: создаёт подтверждённый аккаунт с паролем (без писем). Работает один раз на email. */
export async function setFirstPassword(rawEmail: string, password: string): Promise<Result> {
  const email = rawEmail.trim().toLowerCase();
  if (!allowed(email)) return { ok: false, error: "Этот email не в списке игроков арены." };
  if (password.length < 6) return { ok: false, error: "Пароль — минимум 6 символов." };

  const admin = supabaseAdmin();
  if (!admin) return { ok: false, error: "На сервере не задан SUPABASE_SERVICE_ROLE_KEY." };

  const { data: player, error: pErr } = await admin.from("players").select("id, user_id, password_set").eq("email", email).maybeSingle();
  if (pErr || !player) return { ok: false, error: "Профиль игрока не найден — примените миграции Supabase." };
  if (player.password_set) return { ok: false, error: "Пароль уже задан. Войдите на вкладке «Вход»." };

  // Пользователь мог появиться раньше (например, от входа по ссылке) — тогда просто задаём пароль
  let userId = player.user_id;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  }
  const res = userId
    ? await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (res.error) return { ok: false, error: res.error.message };

  await admin.from("players").update({ password_set: true, user_id: res.data.user.id }).eq("id", player.id);
  return signInWithPassword(email, password);
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
