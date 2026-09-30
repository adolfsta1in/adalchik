import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function AchievementsPage() {
  const { supabase, players } = await getSession();
  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from("achievements").select("*").order("sort"),
    supabase.from("player_achievements").select("player_id, code, earned_at"),
  ]);
  const has = new Map((earned ?? []).map((e) => [`${e.player_id}:${e.code}`, e.earned_at]));

  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/more" className="text-sm text-muted">← Ещё</Link>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Достижения</h1>
      <ul className="space-y-2">
        {(all ?? []).map((a) => (
          <li key={a.code} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-3xl">{a.icon}</span>
            <div className="flex-1">
              <div className="font-bold">{a.title}</div>
              <div className="text-xs text-muted">{a.description}</div>
            </div>
            <div className="flex gap-1">
              {players.map((p) => {
                const at = has.get(`${p.id}:${a.code}`);
                return (
                  <span key={p.id} title={p.name}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${at ? "" : "opacity-15"}`}
                    style={{ background: p.avatar_color }}>
                    {p.name.slice(0, 1)}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
