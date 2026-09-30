"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ACTION_BY_TYPE, FEED_VERB, fmtTime, fmtUsd, type ActivityType, type Player } from "@/lib/game";

export type FeedItem = {
  id: string;
  player_id: string;
  type: ActivityType;
  points: number;
  created_at: string;
  deal_value: number | null;
  void_kind: string | null;
  leads: { company: string } | null;
};

export function Feed({ items, players, meId, viewerTz, undoMinutes }: {
  items: FeedItem[]; players: Player[]; meId: string; viewerTz: string; undoMinutes: number;
}) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const now = useNow();
  if (!items.length) return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">Пока тихо. Сделай первый звонок!</p>;

  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const p = byId[it.player_id];
        const voided = it.void_kind === "late";
        const age = now ? (now - new Date(it.created_at).getTime()) / 60000 : Infinity;
        return (
          <li key={it.id} className="animate-slide flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: p?.avatar_color + "26" }}>
              {ACTION_BY_TYPE[it.type].icon}
            </span>
            <div className={`min-w-0 flex-1 text-sm ${voided ? "opacity-50" : ""}`}>
              <p className={`truncate ${voided ? "line-through" : ""}`}>
                <b style={{ color: p?.avatar_color }}>{p?.name}</b> {FEED_VERB[it.type]}
                {it.type === "deal" && it.deal_value ? ` на ${fmtUsd(it.deal_value)}` : ""}
              </p>
              <p className="truncate text-xs text-muted">
                {fmtTime(it.created_at, viewerTz)}
                {it.leads?.company ? ` · ${it.leads.company}` : ""}
                {voided ? " · отменено" : ""}
              </p>
            </div>
            {it.player_id === meId && !voided && age < 24 * 60 && <UndoButton id={it.id} createdAt={it.created_at} undoMinutes={undoMinutes} />}
            <span className={`font-display tabular text-lg font-bold ${voided ? "line-through opacity-40" : ""}`} style={{ color: p?.avatar_color }}>
              +{it.points}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function UndoButton({ id, createdAt, undoMinutes = 10, onDone }: {
  id: string; createdAt: string; undoMinutes?: number; onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold"
      onClick={() => {
        const late = (Date.now() - new Date(createdAt).getTime()) / 60000 >= undoMinutes;
        if (late && !confirm("Прошло больше 10 минут — отмена будет видна в ленте. Отменить?")) return;
        start(async () => {
          const { error } = await supabaseBrowser().rpc("undo_activity", { p_id: id });
          if (error) alert(error.message);
          onDone?.();
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Отменить"}
    </button>
  );
}

/** Текущее время, обновляется раз в 30 с (null до гидрации) */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}
