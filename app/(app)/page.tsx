import Link from "next/link";
import { Feed, type FeedItem } from "@/components/Feed";
import { ScoreBoard } from "@/components/ScoreBoard";
import { BlitzBanner } from "@/components/BlitzBanner";
import { MorningBrief } from "@/components/MorningBrief";
import { NotificationBell } from "@/components/NotificationBell";
import { WeeklyGoal } from "@/components/WeeklyGoal";
import { fmtUsd, plural, type Player } from "@/lib/game";
import { gameState, localsFor } from "@/lib/game-state";
import { getSession } from "@/lib/session";

export default async function ArenaPage() {
  const { supabase, me, rival, today } = await getSession();
  const players = [me, ...(rival ? [rival] : [])];

  // У каждого игрока своя локальная неделя и свой «сегодня»
  const locals = localsFor(players);

  const [weekRows, dayRows, month, feed, settings, game, { count: unread }] = await Promise.all([
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
      .limit(30),
    supabase.from("app_settings").select("undo_window_minutes, quest_bonus").single(),
    gameState(supabase, players, locals),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("player_id", me.id).is("read_at", null),
  ]);

  const weekday = new Date(today.local_date! + "T00:00:00Z").getUTCDay(); // 0 = вс
  const quest = game.quests[0];

  const scores = players.map((p, i) => ({ player: p, points: weekRows[i].data?.points ?? 0 }));
  const days = players.map((p, i) => ({ player: p, stats: dayRows[i].data }));

  return (
    <main className="space-y-5 px-4 pt-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Арена</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">неделя с {new Date(today.week_start! + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
          <NotificationBell unread={unread ?? 0} />
        </div>
      </header>

      <MorningBrief
        date={today.local_date!}
        name={me.name}
        quest={quest ? { title: quest.title!, description: quest.description! } : null}
        myPoints={scores[0].points}
        rivalPoints={scores[1]?.points ?? null}
        rivalName={rival?.name ?? null}
        streak={game.streaks[0]?.current ?? 0}
        todayDone={game.streaks[0]?.today_done ?? false}
        minCalls={game.streaks[0]?.min_calls ?? 20}
      />

      {game.blitz ? (
        <BlitzBanner blitz={game.blitz} meId={me.id} players={players} />
      ) : null}

      <ScoreBoard scores={scores} meId={me.id} />

      {(weekday === 5 || weekday === 6 || weekday === 0) && (
        <Link href="/week" className="flex items-center justify-between rounded-2xl bg-gold/15 px-4 py-3 font-semibold">
          <span>🏆 Итоги недели и наказание</span>
          <span>→</span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3">
        {players.map((p, i) => {
          const st = game.streaks[i];
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
              <span className={`text-2xl ${st?.current ? "" : "grayscale opacity-50"}`}>🔥</span>
              <div>
                <div className="font-display tabular text-2xl font-bold leading-none" style={{ color: p.avatar_color }}>
                  {st?.current ?? 0}
                </div>
                <div className="text-[11px] text-muted">
                  {plural(st?.current ?? 0, ["день", "дня", "дней"])} подряд · рекорд {st?.best ?? 0}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {quest && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Квест дня · +{settings.data?.quest_bonus ?? 15}</span>
            {quest.done && <span className="text-sm font-bold text-good">выполнен ✓</span>}
          </div>
          <div className="font-bold">{quest.title}</div>
          <p className="mb-3 text-sm text-muted">{quest.description}</p>
          <div className="space-y-1.5">
            {players.map((p, i) => {
              const q = game.quests[i];
              const pct = q ? Math.round((q.progress! / q.target!) * 100) : 0;
              return (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-14 truncate font-semibold">{p.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.avatar_color }} />
                  </div>
                  <span className="w-10 text-right tabular">{q?.progress ?? 0}/{q?.target ?? 0}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <WeeklyGoal
        me={me}
        players={players}
        weekStart={today.week_start!}
        goals={game.goals}
        points={scores.map((s) => s.points)}
        isMonday={weekday === 1}
      />

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
