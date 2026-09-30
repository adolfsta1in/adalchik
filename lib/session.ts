import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Текущий игрок, соперник и серверный клиент. Кешируется на время запроса. */
export const getSession = cache(async () => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: players } = await supabase.from("players").select("*").order("created_at");
  const me = players?.find((p) => p.user_id === uid);
  if (!me) redirect("/login?error=noplayer");
  const rival = players!.find((p) => p.id !== me.id) ?? null;

  const { data: today } = await supabase.rpc("player_today", { p_player: me.id }).single();
  return { supabase, me, rival, players: players!, today: today! };
});
