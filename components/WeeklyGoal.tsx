"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import type { Player } from "@/lib/game";

type Goal = Database["public"]["Tables"]["weekly_goals"]["Row"] | null;

export function WeeklyGoal({ me, players, weekStart, goals, points, isMonday }: {
  me: Player; players: Player[]; weekStart: string; goals: Goal[]; points: number[]; isMonday: boolean;
}) {
  const router = useRouter();
  const myGoal = goals[0];
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(myGoal?.target_points ?? 300);
  const [meetings, setMeetings] = useState(myGoal?.target_meetings ?? 2);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      await supabaseBrowser().from("weekly_goals")
        .upsert({ player_id: me.id, week_start: weekStart, target_points: target, target_meetings: meetings });
      setEditing(false);
      router.refresh();
    });

  if (!myGoal || editing)
    return (
      <section className={`rounded-2xl border-2 p-4 ${isMonday ? "border-gold" : "border-dashed border-border"}`}>
        <div className="mb-2 font-bold">{isMonday ? "📌 Понедельник! Поставь цель на неделю" : "📌 Цель на неделю"}</div>
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="text-xs text-muted">очков</span>
            <input type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 font-display text-xl tabular outline-none" />
          </label>
          <label className="w-24">
            <span className="text-xs text-muted">встреч</span>
            <input type="number" inputMode="numeric" value={meetings} onChange={(e) => setMeetings(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 font-display text-xl tabular outline-none" />
          </label>
          <button disabled={pending || target <= 0} onClick={save}
            className="rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50" style={{ background: me.avatar_color }}>
            OK
          </button>
        </div>
      </section>
    );

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Цели недели</span>
        <button className="text-xs text-muted underline" onClick={() => setEditing(true)}>изменить мою</button>
      </div>
      <div className="space-y-2">
        {players.map((p, i) => {
          const g = goals[i];
          const pct = g ? Math.min(100, Math.round((points[i] / g.target_points) * 100)) : 0;
          return (
            <div key={p.id}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{p.name}</span>
                <span className="tabular text-muted">
                  {g ? <>{points[i]} / {g.target_points} {pct >= 100 && "✅"}</> : "цель не задана"}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.avatar_color }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
