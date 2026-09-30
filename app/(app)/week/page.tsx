import Link from "next/link";
import { PenaltyForm } from "@/components/PenaltyForm";
import { addDays, weekLabel } from "@/lib/game";
import { getSession } from "@/lib/session";

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const { supabase, today } = await getSession();
  const sp = await searchParams;
  const current = today.week_start!;
  const week = typeof sp.w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.w) ? sp.w : current;

  const [{ data: rows }, { data: weeks }, { data: goals }, { data: penalty }, { data: meetings }] = await Promise.all([
    supabase.rpc("week_summary", { p_week: week }),
    supabase.from("v_weekly_scores").select("week_start").order("week_start", { ascending: false }).limit(200),
    supabase.from("weekly_goals").select("*").eq("week_start", week),
    supabase.from("penalties").select("text").eq("week_start", week).maybeSingle(),
    supabase.from("activities").select("player_id").eq("week_start", week).eq("type", "meeting_set").is("voided_at", null),
  ]);
  const goalOf = Object.fromEntries((goals ?? []).map((g) => [g.player_id, g]));
  const meetingsOf = (id: string) => (meetings ?? []).filter((m) => m.player_id === id).length;
  const weekList = [...new Set((weeks ?? []).map((w) => w.week_start!))];
  if (!weekList.includes(current)) weekList.unshift(current);

  const closed = (rows ?? []).every((r) => r.week_closed);
  const volume = rows?.find((r) => r.volume_winner);
  const growth = rows?.find((r) => r.growth_winner);
  const calibrating = rows?.some((r) => r.calibrating);
  const loser = volume ? rows?.find((r) => r.player_id !== volume.player_id) : null;

  return (
    <main className="space-y-4 px-4 pt-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Итоги недели</h1>
      </header>

      <nav className="flex items-center justify-between rounded-2xl bg-surface p-2">
        <Link href={`/week?w=${addDays(week, -7)}`} className="rounded-xl px-4 py-2 text-lg">←</Link>
        <div className="text-center">
          <div className="font-semibold">{weekLabel(week)}</div>
          <div className="text-xs text-muted">{closed ? "неделя закрыта" : week === current ? "идёт сейчас" : "ещё идёт у одного из игроков"}</div>
        </div>
        <Link href={week >= current ? "#" : `/week?w=${addDays(week, 7)}`} aria-disabled={week >= current}
          className={`rounded-xl px-4 py-2 text-lg ${week >= current ? "pointer-events-none opacity-30" : ""}`}>→</Link>
      </nav>

      <section className="grid grid-cols-2 gap-3">
        <Trophy title="Объём" emoji="🏋️" hint="больше очков за неделю"
          winner={volume ? { name: volume.name!, color: volume.avatar_color! } : null}
          empty={closed ? "ничья" : "пока впереди — см. ниже"} provisional={!closed} />
        <Trophy title="Рост" emoji="📈" hint="очки / среднее за 4 прошлые недели"
          winner={growth ? { name: growth.name!, color: growth.avatar_color! } : null}
          empty={calibrating ? "калибровка" : closed ? "ничья" : "—"} provisional={!closed} />
      </section>

      <section className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.player_id} className="rounded-2xl border border-border bg-surface p-4" style={{ borderLeftColor: r.avatar_color!, borderLeftWidth: 6 }}>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-bold">{r.name}</div>
                <div className="text-xs text-muted">{r.region_label}</div>
              </div>
              <div className="font-display tabular text-4xl font-bold" style={{ color: r.avatar_color! }}>{r.points}</div>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-muted">
              {r.calibrating ? (
                <span>🧪 калибровка: {r.prev_weeks} из 2 нед. истории</span>
              ) : (
                <>
                  <span>среднее: <b className="text-text">{r.prev_avg ?? 0}</b></span>
                  <span>рост: <b className="text-text">{r.growth != null ? `×${Number(r.growth).toFixed(2)}` : "—"}</b></span>
                </>
              )}
              {r.volume_winner && <span>🏋️</span>}
              {r.growth_winner && <span>📈</span>}
            </div>
            {goalOf[r.player_id!] && (() => {
              const g = goalOf[r.player_id!];
              const ok = r.points! >= g.target_points && meetingsOf(r.player_id!) >= g.target_meetings;
              return (
                <div className="mt-2 text-sm">
                  📌 цель: {g.target_points} оч.{g.target_meetings ? ` и ${g.target_meetings} встр.` : ""} →{" "}
                  <b className={ok ? "text-good" : "text-muted"}>{ok ? "выполнена ✓" : `${r.points} оч., ${meetingsOf(r.player_id!)} встр.`}</b>
                </div>
              );
            })()}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border-2 border-bad/40 bg-bad/5 p-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-bad">Наказание проигравшему</div>
        {loser && (
          <p className="mb-2 text-sm">
            {closed ? "Проиграл" : "Сейчас проигрывает"}: <b style={{ color: loser.avatar_color! }}>{loser.name}</b>
          </p>
        )}
        <PenaltyForm week={week} text={penalty?.text ?? ""} locked={closed} />
      </section>

      <p className="text-xs text-muted">
        У каждого игрока неделя идёт по его местному времени (пн–вс). Итог фиксируется, когда воскресенье закончилось у обоих.
        «Рост» уравнивает шансы при разных рынках: сравнивается прогресс игрока относительно самого себя.
      </p>

      {weekList.length > 1 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Архив недель</h2>
          <div className="flex flex-wrap gap-2">
            {weekList.map((w) => (
              <Link key={w} href={`/week?w=${w}`} className={`rounded-full px-3 py-1.5 text-sm ${w === week ? "bg-accent text-bg" : "bg-surface-2"}`}>
                {weekLabel(w)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Trophy({ title, emoji, hint, winner, empty, provisional }: {
  title: string; emoji: string; hint: string; winner: { name: string; color: string } | null; empty: string; provisional: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 text-center text-white" style={{ background: winner ? winner.color : "#2a2d35" }}>
      <div className="text-4xl">{emoji}</div>
      <div className="font-display text-lg font-bold uppercase">{title}</div>
      <div className="mt-1 text-xl font-bold">{winner ? winner.name : empty}</div>
      <div className="mt-1 text-[11px] opacity-80">{provisional && winner ? "лидирует · " : ""}{hint}</div>
    </div>
  );
}
