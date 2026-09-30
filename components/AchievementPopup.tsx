"use client";

import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = { code: string; title: string; description: string; icon: string };

/** Показывает новые достижения по одному с анимацией и отмечает их просмотренными. */
export function AchievementPopup({ items, playerId, color }: { items: Item[]; playerId: string; color: string }) {
  const [queue, setQueue] = useState(items);
  const [, start] = useTransition();
  const cur = queue[0];
  if (!cur) return null;

  const close = () =>
    start(async () => {
      setQueue((q) => q.slice(1));
      await supabaseBrowser().from("player_achievements").update({ seen: true }).eq("player_id", playerId).eq("code", cur.code);
    });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6" onClick={close}>
      <div key={cur.code} className="animate-pop w-full max-w-xs rounded-3xl bg-surface p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full text-6xl"
          style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }}>
          {cur.icon}
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-gold">Новое достижение</div>
        <div className="font-display text-3xl font-bold uppercase">{cur.title}</div>
        <p className="mt-1 text-sm text-muted">{cur.description}</p>
        <button className="mt-5 w-full rounded-2xl py-3 font-bold text-white" style={{ background: color }}>Круто!</button>
      </div>
    </div>
  );
}
