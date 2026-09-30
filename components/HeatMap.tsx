"use client";

import { useState } from "react";
import { WEEKDAYS, tint, type Player } from "@/lib/game";

type Cell = { player_id: string; dow: number; hour: number; dials: number; talks: number };

export function HeatMap({ players, cells }: { players: Player[]; cells: Cell[] }) {
  const [pid, setPid] = useState(players[0]?.id);
  const [sel, setSel] = useState<Cell | null>(null);
  const player = players.find((p) => p.id === pid)!;
  const mine = cells.filter((c) => c.player_id === pid);
  const at = new Map(mine.map((c) => [`${c.dow}:${c.hour}`, c]));
  const hours = mine.length
    ? Array.from({ length: Math.max(...mine.map((c) => c.hour)) - Math.min(...mine.map((c) => c.hour)) + 1 }, (_, i) => Math.min(...mine.map((c) => c.hour)) + i)
    : [];
  const MIN = 3;

  // лучшие часы (сумма по дням недели)
  const byHour = new Map<number, { d: number; t: number }>();
  for (const c of mine) {
    const h = byHour.get(c.hour) ?? { d: 0, t: 0 };
    h.d += c.dials;
    h.t += c.talks;
    byHour.set(c.hour, h);
  }
  const best = [...byHour.entries()].filter(([, v]) => v.d >= 5).sort((a, b) => b[1].t / b[1].d - a[1].t / a[1].d).slice(0, 3);

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex gap-1">
        {players.map((p) => (
          <button key={p.id} onClick={() => { setPid(p.id); setSel(null); }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${pid === p.id ? "text-white" : "bg-surface-2 text-muted"}`}
            style={pid === p.id ? { background: p.avatar_color } : undefined}>
            {p.name} · {p.region_label}
          </button>
        ))}
      </div>

      {best.length > 0 && (
        <p className="mb-3 text-sm">
          🔥 Лучшие часы:{" "}
          {best.map(([h, v], i) => (
            <b key={h}>{i ? ", " : ""}{h}:00 ({Math.round((v.t / v.d) * 100)}%)</b>
          ))}
        </p>
      )}

      {hours.length === 0 ? (
        <p className="text-sm text-muted">Нет данных за период.</p>
      ) : (
        <div className="grid gap-[2px] text-[10px]" style={{ gridTemplateColumns: `2.2rem repeat(7, 1fr)` }}>
          <span />
          {WEEKDAYS.map((d) => <span key={d} className="text-center text-muted">{d}</span>)}
          {hours.map((h) => (
            <Row key={h} h={h} at={at} color={player.avatar_color} min={MIN} onPick={setSel} sel={sel} />
          ))}
        </div>
      )}

      <p className="mt-3 min-h-5 text-xs text-muted">
        {sel
          ? `${WEEKDAYS[sel.dow - 1]} ${sel.hour}:00 — ${sel.dials} наборов, ${sel.talks} разговоров (${Math.round((sel.talks / sel.dials) * 100)}%)`
          : `Нажмите на ячейку. Бледные ячейки — меньше ${MIN} наборов.`}
      </p>
    </div>
  );
}

function Row({ h, at, color, min, onPick, sel }: {
  h: number; at: Map<string, Cell>; color: string; min: number; onPick: (c: Cell | null) => void; sel: Cell | null;
}) {
  return (
    <>
      <span className="self-center pr-1 text-right text-muted tabular">{h}:00</span>
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const c = at.get(`${d}:${h}`);
        const conv = c && c.dials ? c.talks / c.dials : 0;
        const enough = c && c.dials >= min;
        const active = sel && c && sel.dow === c.dow && sel.hour === c.hour;
        const alpha = c ? (enough ? 0.15 + conv * 0.85 : 0.07) : 0;
        return (
          <button key={d} onClick={() => onPick(c ?? null)} aria-label={`${d} ${h}`}
            className={`flex h-7 items-center justify-center rounded-[4px] tabular ${active ? "ring-2 ring-text" : ""}`}
            style={{ background: c ? tint(color, alpha) : "var(--surface-2)", color: alpha > 0.55 ? "#fff" : "var(--text)" }}>
            {enough ? <span className="font-semibold">{Math.round(conv * 100)}</span> : ""}
          </button>
        );
      })}
    </>
  );
}
