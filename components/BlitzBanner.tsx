"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Player } from "@/lib/game";
import { fmtClock, useCountdown } from "./useCountdown";

type Blitz = { id: string | null; started_by: string | null; ends_at: string | null; participants: string[] };

export function BlitzBanner({ blitz, meId, players }: { blitz: Blitz; meId: string; players: Player[] }) {
  const router = useRouter();
  const left = useCountdown(blitz.ends_at!);
  const [pending, start] = useTransition();
  const joined = blitz.participants.includes(meId);
  const starter = players.find((p) => p.id === blitz.started_by);
  if (left === 0) return null;

  return (
    <div className="animate-slide flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#e11d48] px-4 py-3 text-white shadow-lg">
      <span className="text-3xl">⚡</span>
      <div className="flex-1">
        <div className="font-display text-lg font-bold uppercase leading-tight">Power Hour ×2</div>
        <div className="text-xs opacity-90">
          {joined ? "Ты в игре" : `${starter?.name ?? "Брат"} зовёт на блиц`} · осталось <b className="tabular">{fmtClock(left)}</b>
        </div>
      </div>
      {joined ? (
        <Link href="/blitz" className="rounded-xl bg-white/20 px-3 py-2 text-sm font-bold">Табло</Link>
      ) : (
        <button disabled={pending} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#e11d48]"
          onClick={() => start(async () => {
            await supabaseBrowser().rpc("join_blitz", { p_id: blitz.id! });
            router.push("/blitz");
          })}>
          Принять
        </button>
      )}
    </div>
  );
}
