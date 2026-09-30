"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Rule = Database["public"]["Tables"]["scoring_rules"]["Row"];
type Settings = Database["public"]["Tables"]["app_settings"]["Row"];
type Goal = Database["public"]["Tables"]["month_goals"]["Row"] | null;

export function SettingsForm({ rules, settings, month, goal }: { rules: Rule[]; settings: Settings; month: string; goal: Goal }) {
  const router = useRouter();
  const [r, setR] = useState(rules);
  const [s, setS] = useState(settings);
  const [g, setG] = useState({ metric: goal?.metric ?? "points", target: goal?.target ?? 0 });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setMsg(null);
      const supabase = supabaseBrowser();
      const now = new Date().toISOString();
      const changed = r.filter((x, i) => x.points !== rules[i].points || x.usd_step !== rules[i].usd_step || x.step_points !== rules[i].step_points);
      for (const x of changed) {
        const { error } = await supabase.from("scoring_rules")
          .update({ points: x.points, usd_step: x.usd_step, step_points: x.step_points, updated_at: now }).eq("type", x.type);
        if (error) return setMsg(error.message);
      }
      const { id: _id, ...rest } = s;
      void _id;
      const { error: e1 } = await supabase.from("app_settings").update({ ...rest, updated_at: now }).eq("id", true);
      if (e1) return setMsg(e1.message);
      if (g.target > 0) {
        const { error: e2 } = await supabase.from("month_goals")
          .upsert({ month, metric: g.metric, target: g.target, updated_at: now });
        if (e2) return setMsg(e2.message);
      }
      setMsg("Сохранено. Новые правила действуют для новых действий.");
      router.refresh();
    });

  const num = "w-20 rounded-lg border border-border bg-bg px-2 py-2 text-right tabular outline-none";

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h3 className="mb-2 font-bold">🎯 Цель месяца</h3>
        <div className="flex gap-2">
          <select value={g.metric} onChange={(e) => setG({ ...g, metric: e.target.value })}
            className="flex-1 rounded-lg border border-border bg-bg px-2 py-2">
            <option value="points">очков вместе</option>
            <option value="meetings">встреч вместе</option>
          </select>
          <input type="number" min={0} value={g.target || ""} placeholder="цель" onChange={(e) => setG({ ...g, target: Number(e.target.value) })}
            className="w-28 rounded-lg border border-border bg-bg px-2 py-2 text-right tabular outline-none" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-bold">Очки за действия</h3>
        <ul className="space-y-1.5">
          {r.map((x, i) => (
            <li key={x.type} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{x.label}</span>
              <input type="number" className={num} value={x.points}
                onChange={(e) => setR(r.map((y, j) => (j === i ? { ...y, points: Number(e.target.value) } : y)))} />
            </li>
          ))}
        </ul>
        {r.filter((x) => x.type === "deal").map((x) => (
          <p key="deal" className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            Сделка: +
            <input type="number" className={`${num} w-14`} value={x.step_points}
              onChange={(e) => setR(r.map((y) => (y.type === "deal" ? { ...y, step_points: Number(e.target.value) } : y)))} />
            за каждые $
            <input type="number" className={num} value={x.usd_step ?? 100}
              onChange={(e) => setR(r.map((y) => (y.type === "deal" ? { ...y, usd_step: Number(e.target.value) || null } : y)))} />
          </p>
        ))}
      </div>

      <div className="space-y-1.5 text-sm">
        <h3 className="mb-2 font-bold">Игра</h3>
        <Row label="Минимум наборов в день (для серии)"><input type="number" className={num} value={s.streak_min_calls} onChange={(e) => setS({ ...s, streak_min_calls: Number(e.target.value) })} /></Row>
        <Row label="Окно тихой отмены, мин"><input type="number" className={num} value={s.undo_window_minutes} onChange={(e) => setS({ ...s, undo_window_minutes: Number(e.target.value) })} /></Row>
        <Row label="Бонус автору скрипта"><input type="number" className={num} value={s.script_bonus} onChange={(e) => setS({ ...s, script_bonus: Number(e.target.value) })} /></Row>
        <Row label="Бонус за квест дня"><input type="number" className={num} value={s.quest_bonus} onChange={(e) => setS({ ...s, quest_bonus: Number(e.target.value) })} /></Row>
        <Row label="Множитель блица"><input type="number" step="0.5" className={num} value={s.blitz_multiplier} onChange={(e) => setS({ ...s, blitz_multiplier: Number(e.target.value) })} /></Row>
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button disabled={pending} onClick={save} className="w-full rounded-xl bg-accent py-3 font-bold text-bg disabled:opacity-50">
        Сохранить правила
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="flex-1">{label}</span>
      {children}
    </label>
  );
}
