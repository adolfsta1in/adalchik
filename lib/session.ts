import { cache } from "react";
import { redirect } from "next/navigation";
import { playerToday } from "@/lib/game";
import { supabaseServer } from "@/lib/supabase/server";

/** Текущий игрок, соперник и серверный клиент. Кешируется на время запроса. */
export const getSession = cache(async () => {
  const supabase = await supabaseServer();
  // проверка сессии и загрузка игроков — параллельно (RLS всё равно пустит только вошедшего)
  const [{ data: auth }, { data: players }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("players").select("*").order("created_at"),
  ]);
  const uid = auth?.claims?.sub;
  if (!uid) redirect("/login");

  const me = players?.find((p) => p.user_id === uid);
  if (!me) redirect("/login?error=noplayer");
  const rival = players!.find((p) => p.id !== me.id) ?? null;

  const today = playerToday(me.timezone);
  return { supabase, me, rival, players: players!, today };
});
