import type { supabaseServer } from "@/lib/supabase/server";
import type { Player } from "@/lib/game";

type DB = Awaited<ReturnType<typeof supabaseServer>>;
export type Local = { local_date: string | null; week_start: string | null };

export async function localsFor(supabase: DB, players: Player[]) {
  return Promise.all(
    players.map(async (p) => (await supabase.rpc("player_today", { p_player: p.id }).single()).data as Local),
  );
}

/** Серии, квест дня, цели недели и идущий блиц для экрана «Арена». */
export async function gameState(supabase: DB, players: Player[], locals: Local[]) {
  const [streaks, quests, goals, blitz] = await Promise.all([
    Promise.all(players.map((p) => supabase.rpc("player_streak", { p_player: p.id }).single())),
    Promise.all(players.map((p, i) => supabase.rpc("quest_progress", { p_player: p.id, p_date: locals[i].local_date! }).maybeSingle())),
    Promise.all(
      players.map((p, i) =>
        supabase.from("weekly_goals").select("*").eq("player_id", p.id).eq("week_start", locals[i].week_start!).maybeSingle(),
      ),
    ),
    activeBlitz(supabase),
  ]);
  return {
    streaks: streaks.map((r) => r.data),
    quests: quests.map((r) => r.data),
    goals: goals.map((r) => r.data),
    blitz,
  };
}

export async function activeBlitz(supabase: DB) {
  const { data } = await supabase.rpc("active_blitz");
  if (!data?.id) return null;
  const { data: parts } = await supabase.from("blitz_participants").select("player_id").eq("blitz_id", data.id);
  return { ...data, participants: (parts ?? []).map((p) => p.player_id) };
}
