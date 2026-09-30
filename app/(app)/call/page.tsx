import { CallScreen } from "@/components/CallScreen";
import { DEFAULT_INDUSTRIES } from "@/lib/game";
import { activeBlitz } from "@/lib/game-state";
import { getSession } from "@/lib/session";

export default async function CallPage({ searchParams }: PageProps<"/call">) {
  const { supabase, me, today } = await getSession();
  const { lead: leadId } = await searchParams;

  const [queue, industries, objections, scripts, rules, stats, recent, lastOffer, preselected, settings] = await Promise.all([
    supabase.from("leads").select("*").eq("owner_id", me.id).eq("status", "new").order("created_at").limit(60),
    supabase.from("leads").select("industry").not("industry", "is", null).limit(2000),
    supabase.from("objections").select("id, text").order("created_at"),
    supabase.from("scripts").select("id, objection_id, text, author_id").order("created_at"),
    supabase.from("scoring_rules").select("type, points, usd_step, step_points"),
    supabase.from("v_daily_stats").select("*").eq("player_id", me.id).eq("local_date", today.local_date!).maybeSingle(),
    supabase
      .from("activities")
      .select("id, type, points, created_at, leads(company)")
      .eq("player_id", me.id)
      .is("voided_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("activities").select("offer").eq("player_id", me.id).not("offer", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    typeof leadId === "string" ? supabase.from("leads").select("*").eq("id", leadId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("app_settings").select("undo_window_minutes, streak_min_calls, blitz_multiplier").single(),
  ]);
  const [blitz, quest] = await Promise.all([
    activeBlitz(supabase),
    supabase.rpc("quest_progress", { p_player: me.id, p_date: today.local_date! }).maybeSingle(),
  ]);
  const myBlitz = blitz && blitz.participants.includes(me.id)
    ? { endsAt: blitz.ends_at!, mult: Number(settings.data?.blitz_multiplier ?? 2) }
    : null;

  const industryCounts = new Map<string, number>();
  for (const r of industries.data ?? []) industryCounts.set(r.industry!, (industryCounts.get(r.industry!) ?? 0) + 1);
  const industryList = [...industryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  for (const d of DEFAULT_INDUSTRIES) if (!industryList.includes(d)) industryList.push(d);

  return (
    <CallScreen
      me={me}
      queue={queue.data ?? []}
      initialLead={preselected.data ?? null}
      industries={industryList.slice(0, 16)}
      objections={objections.data ?? []}
      scripts={scripts.data ?? []}
      rules={rules.data ?? []}
      stats={stats.data}
      recent={(recent.data ?? []) as never}
      lastOffer={lastOffer.data?.offer ?? null}
      undoMinutes={settings.data?.undo_window_minutes ?? 10}
      dailyMin={settings.data?.streak_min_calls ?? 20}
      blitz={myBlitz}
      quest={quest.data ?? null}
    />
  );
}
