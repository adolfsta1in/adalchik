"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Player } from "@/lib/game";
import { fmtClock, useCountdown } from "./useCountdown";

type Score = { player_id: string | null; points: number | null; actions: number | null; joined: boolean | null };
type Blitz = { id: string | null; started_by: string | null; ends_at: string | null; participants: string[] };

export function BlitzBoard({ blitz, players, meId, score, mult }: {
  blitz: Blitz; players: Player[]; meId: string; score: Score[]; mult: number;
}) {
  const router = useRouter();
  const left = useCountdown(blitz.ends_at!);
  const [pending, start] = useTransition();
  const joined = blitz.participants.includes(meId);
  const me = players.find((p) => p.id === meId)!;
  const ordered = [...players].sort((a) => (a.id === meId ? -1 : 1));
  const byId = Object.fromEntries(score.map((s) => [s.player_id, s]));
  const done = left === 0;

  // страховка к Realtime: табло блица освежается раз в 10 секунд
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0d10] text-white pt-safe pb-safe">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-display text-lg font-bold uppercase tracking-widest">⚡ Power Hour ×{mult}</span>
        <Link href="/" className="rounded-full bg-white/10 px-3 py-1.5 text-sm">Закрыть</Link>
      </div>

      <div className={`py-6 text-center font-display tabular text-8xl font-bold ${left != null && left < 300 ? "text-[#f87171]" : ""}`}>
        {done ? "ФИНИШ" : fmtClock(left)}
      </div>

      <div className="grid flex-1 grid-rows-2 gap-2 px-3">
        {ordered.map((p) => {
          const s = byId[p.id];
          return (
            <div key={p.id} className="flex items-center justify-between rounded-3xl px-5"
              style={{ background: `linear-gradient(90deg, ${p.avatar_color}66, ${p.avatar_color}11)` }}>
              <div>
                <div className="text-xl font-bold">{p.id === meId ? "Я" : p.name}</div>
                <div className="text-sm opacity-70">
                  {s?.joined ? `${s?.actions ?? 0} действий` : "ещё не присоединился"}
                </div>
              </div>
              <div key={s?.points} className="animate-bump font-display tabular text-8xl font-bold" style={{ color: p.avatar_color }}>
                {s?.points ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {joined ? (
          <Link href="/call" className="col-span-2 rounded-2xl py-4 text-center text-xl font-bold" style={{ background: me.avatar_color }}>
            📞 Звонить ×{mult}
          </Link>
        ) : (
          <button disabled={pending || done} className="col-span-2 rounded-2xl py-4 text-xl font-bold" style={{ background: me.avatar_color }}
            onClick={() => start(async () => { await supabaseBrowser().rpc("join_blitz", { p_id: blitz.id! }); router.refresh(); })}>
            Принять вызов
          </button>
        )}
        {blitz.started_by === meId && !done && (
          <button disabled={pending} className="col-span-2 py-2 text-sm opacity-60"
            onClick={() => { if (confirm("Остановить блиц?")) start(async () => { await supabaseBrowser().rpc("stop_blitz", { p_id: blitz.id! }); router.push("/"); }); }}>
            Остановить блиц
          </button>
        )}
      </div>
    </div>
  );
}

export function StartBlitz({ color }: { color: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className="w-full rounded-2xl py-5 text-xl font-bold text-white shadow-lg disabled:opacity-50" style={{ background: color }}
      onClick={() => start(async () => {
        const { error } = await supabaseBrowser().rpc("start_blitz");
        if (error) alert(error.message);
        router.refresh();
      })}>
      ⚡ Запустить на 60 минут
    </button>
  );
}
