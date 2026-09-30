import Link from "next/link";
import { Feed, type FeedItem } from "@/components/Feed";
import { ScoreBoard } from "@/components/ScoreBoard";
import { fmtUsd, plural, type Player } from "@/lib/game";
import { getSession } from "@/lib/session";

export default async function ArenaPage() {
  const { supabase, me, rival, today } = await getSession();
  const players = [me, ...(rival ? [rival] : [])];

  // У каждого игрока своя локальная неделя и свой «сегодня»
  const locals = await Promise.all(
    players.map(async (p) =>
      p.id === me.id ? today : (await supabase.rpc("player_today", { p_player: p.id }).single()).data!,
    ),
  );

  const [weekRows, dayRows, month, feed, settings] = await Promise.all([
    Promise.all(
      players.map((p, i) =>
        supabase.from("v_weekly_scores").select("points").eq("player_id", p.id).eq("week_start", locals[i].week_start!).maybeSingle(),
      ),
    ),
    Promise.all(
      players.map((p, i) =>
        supabase.from("v_daily_stats").select("*").eq("player_id", p.id).eq("local_date", locals[i].local_date!).maybeSingle(),
      ),
    ),
    supabase.rpc("month_progress", { p_month: today.local_date!.slice(0, 8) + "01" }).single(),
    supabase
      .from("activities")
      .select("id, player_id, type, points, created_at, deal_value, void_kind, offer, leads(company)")
      .or("void_kind.is.null,void_kind.eq.late")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("app_settings").select("undo_window_minutes").single(),
  ]);

  const scores = players.map((p, i) => ({ player: p, points: weekRows[i].data?.points ?? 0 }));
  const days = players.map((p, i) => ({ player: p, stats: dayRows[i].data }));

  return (
    <main className="space-y-5 px-4 pt-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Арена</h1>
        <span className="text-sm text-muted">неделя с {new Date(today.week_start! + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
      </header>

      <ScoreBoard scores={scores} meId={me.id} />

      <MonthGoal data={month.data} players={players} />

      <section className="grid grid-cols-2 gap-3">
        {days.map(({ player, stats }) => (
          <div key={player.id} className="rounded-2xl border border-border bg-surface p-3" style={{ borderTopColor: player.avatar_color, borderTopWidth: 4 }}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-bold">{player.name}</span>
              <span className="text-xs text-muted">сегодня</span>
            </div>
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              <Stat label="наборов" value={stats?.dials ?? 0} />
              <Stat label="разговоров" value={stats?.talks ?? 0} />
              <Stat label="встреч" value={stats?.meetings_set ?? 0} />
              <Stat label="очков" value={stats?.points ?? 0} strong color={player.avatar_color} />
            </dl>
            {(stats?.deal_sum ?? 0) > 0 && <p className="mt-2 text-xs font-bold text-good">сделки: {fmtUsd(stats!.deal_sum!)}</p>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wide">Лента</h2>
        <Feed
          items={(feed.data ?? []) as unknown as FeedItem[]}
          players={players}
          meId={me.id}
          viewerTz={me.timezone}
          undoMinutes={settings.data?.undo_window_minutes ?? 10}
        />
      </section>
    </main>
  );
}

function Stat({ label, value, strong, color }: { label: string; value: number; strong?: boolean; color?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`font-display tabular text-xl leading-none ${strong ? "font-bold" : ""}`} style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}

type MonthData = { metric: string | null; target: number | null; total: number | null; per_player: unknown } | null;

function MonthGoal({ data, players }: { data: MonthData; players: Player[] }) {
  if (!data?.target)
    return (
      <Link href="/more#goal" className="block rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
        🎯 Поставьте общую цель месяца
      </Link>
    );
  const per = (data.per_player ?? {}) as Record<string, number>;
  const unit = data.metric === "meetings" ? plural(data.target, ["встреча", "встречи", "встреч"]) : "очков";
  const pct = Math.min(100, Math.round(((data.total ?? 0) / data.target) * 100));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-bold">🎯 Цель месяца</span>
        <span className="font-display tabular text-lg">
          {data.total} <span className="text-muted">/ {data.target} {unit}</span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {players.map((p) => (
          <div key={p.id} style={{ width: `${Math.min(100, ((per[p.id] ?? 0) / data.target!) * 100)}%`, background: p.avatar_color }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{pct}% вместе</span>
        <span className="flex gap-3">
          {players.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.avatar_color }} />
              {per[p.id] ?? 0}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
