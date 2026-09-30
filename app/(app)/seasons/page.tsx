import Link from "next/link";
import { fmtUsd } from "@/lib/game";
import { getSession } from "@/lib/session";

const monthName = (m: string) =>
  new Date(m + "T00:00:00Z").toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function SeasonsPage({ searchParams }: PageProps<"/seasons">) {
  const { supabase, today, players } = await getSession();
  const sp = await searchParams;
  const current = today.local_date!.slice(0, 8) + "01";
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}-01$/.test(sp.m) ? sp.m : current;
  const [{ data: rows }, { data: list }] = await Promise.all([
    supabase.rpc("season_summary", { p_month: month }),
    supabase.rpc("season_list"),
  ]);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const closed = rows?.[0]?.closed;
  const champ = rows?.find((r) => r.champion);

  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/more" className="text-sm text-muted">← Ещё</Link>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Сезон · {monthName(month)}</h1>

      <section className="rounded-3xl p-5 text-center text-white" style={{ background: champ ? champ.avatar_color! : "#2a2d35" }}>
        <div className="text-5xl">👑</div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-80">{closed ? "Чемпион сезона" : "Лидер сезона"}</div>
        <div className="font-display text-4xl font-bold uppercase">{champ?.name ?? "—"}</div>
      </section>

      <section className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.player_id} className="flex items-center justify-between rounded-2xl bg-surface p-4" style={{ borderLeft: `6px solid ${r.avatar_color}` }}>
            <div>
              <div className="font-bold">{r.name}</div>
              <div className="text-xs text-muted">
                встреч {r.meetings} · сделок {r.deals} · {fmtUsd(Number(r.deal_sum ?? 0))}
              </div>
            </div>
            <div className="font-display tabular text-4xl font-bold" style={{ color: r.avatar_color! }}>{r.points}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Архив сезонов</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {(list ?? []).map((s) => (
            <li key={s.month}>
              <Link href={`/seasons?m=${s.month}`} className="flex items-center justify-between px-4 py-3">
                <span className="capitalize">{monthName(s.month!)}</span>
                <span className="text-sm">
                  {s.champion_id ? <>👑 <b style={{ color: byId[s.champion_id]?.avatar_color }}>{byId[s.champion_id]?.name}</b></> : <span className="text-muted">идёт</span>}
                  <span className="ml-2 text-muted tabular">{s.total} оч.</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
