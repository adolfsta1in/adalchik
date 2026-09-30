"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TIMEZONES, WEEKDAYS, type Player } from "@/lib/game";

const COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#e11d48", "#a855f7", "#eab308", "#14b8a6", "#6366f1"];

export function ProfileForm({ me }: { me: Player }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: me.name,
    timezone: me.timezone,
    region_label: me.region_label,
    avatar_color: me.avatar_color,
    off_days: me.off_days,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const { error } = await supabaseBrowser().from("players").update(f).eq("id", me.id);
      setMsg(error ? error.message : "Сохранено");
      router.refresh();
    });

  const input = "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none";
  const tzs = TIMEZONES.some((t) => t.value === f.timezone) ? TIMEZONES : [{ value: f.timezone, label: f.timezone }, ...TIMEZONES];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{me.email}</p>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Имя</span>
        <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Часовой пояс</span>
          <select className={input} value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
            {tzs.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Регион</span>
          <input className={input} value={f.region_label} onChange={(e) => setF({ ...f, region_label: e.target.value })} />
        </label>
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted">Мой цвет</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setF({ ...f, avatar_color: c })} aria-label={c}
              className={`h-9 w-9 rounded-full ${f.avatar_color === c ? "ring-4 ring-text/30" : ""}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted">Нерабочие дни (не ломают серию)</span>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => {
            const on = f.off_days.includes(i + 1);
            return (
              <button key={d} onClick={() => setF({ ...f, off_days: on ? f.off_days.filter((x) => x !== i + 1) : [...f.off_days, i + 1].sort() })}
                className={`rounded-lg py-2 text-sm font-semibold ${on ? "bg-surface-2 text-muted line-through" : "text-white"}`}
                style={on ? undefined : { background: f.avatar_color }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button disabled={pending} onClick={save} className="w-full rounded-xl bg-accent py-3 font-bold text-bg disabled:opacity-50">
        Сохранить профиль
      </button>
    </div>
  );
}
