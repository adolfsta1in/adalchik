import Link from "next/link";
import { HeatMap } from "@/components/HeatMap";
import { OFFER_LABEL, addDays, fmtUsd, type OfferType } from "@/lib/game";
import { getSession } from "@/lib/session";

const PERIODS = [
  { v: "7", l: "7 дней" },
  { v: "30", l: "30 дней" },
  { v: "90", l: "90 дней" },
  { v: "all", l: "Всё время" },
];

const STEPS = [
  { key: "dials", label: "Наборы" },
  { key: "talks", label: "Разговоры" },
  { key: "meetings_set", label: "Встречи" },
  { key: "meetings_held", label: "Проведены" },
  { key: "proposals", label: "КП" },
  { key: "deals", label: "Сделки" },
] as const;

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const { supabase, me, players, today } = await getSession();
  const sp = await searchParams;
  const period = typeof sp.p === "string" && PERIODS.some((p) => p.v === sp.p) ? sp.p : "30";
  const to = today.local_date!;
  const from = period === "all" ? "2000-01-01" : addDays(to, -Number(period) + 1);
  const args = { p_from: from, p_to: to };

  const [{ data: funnel }, { data: works }, { data: segments }, { data: heat }] = await Promise.all([
    supabase.rpc("funnel", args),
    supabase.rpc("what_works", { ...args, p_min: 3 }),
    supabase.rpc("segment_stats", args),
    supabase.rpc("hour_heatmap", args),
  ]);
  const ordered = [...players].sort((a) => (a.id === me.id ? -1 : 1));
  const fOf = Object.fromEntries((funnel ?? []).map((f) => [f.player_id, f]));
  const regions = [...new Set(players.map((p) => p.region_label))];

  return (
    <main className="space-y-6 px-4 pt-4">
      <Link href="/more" className="text-sm text-muted">← Ещё</Link>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Аналитика</h1>

      <nav className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {PERIODS.map((p) => (
          <Link key={p.v} href={`/analytics?p=${p.v}`}
            className={`rounded-xl py-2 text-center text-sm font-semibold ${period === p.v ? "bg-surface shadow" : "text-muted"}`}>
            {p.l}
          </Link>
        ))}
      </nav>

      {/* Воронка */}
      <Section title="Воронка" hint="полоса — конверсия из предыдущего шага">
        <div className="space-y-3 rounded-2xl bg-surface p-4">
          {STEPS.map((s, i) => (
            <div key={s.key}>
              <div className="mb-1 text-sm font-semibold">{s.label}</div>
              {ordered.map((p) => {
                const f = fOf[p.id];
                const v = f ? (f[s.key] as number) : 0;
                const prev = i === 0 ? v : f ? (f[STEPS[i - 1].key] as number) : 0;
                const c = i === 0 ? 100 : pct(v, prev);
                return (
                  <div key={p.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <span className="w-14 truncate text-muted">{p.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(c, v > 0 ? 2 : 0)}%`, background: p.avatar_color }} />
                    </div>
                    <span className="w-20 text-right tabular">
                      <b>{v}</b>{i > 0 && <span className="text-muted"> · {c}%</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Section>

      {/* Деньги */}
      <Section title="Воронка в деньгах">
        <div className="grid grid-cols-2 gap-2">
          {ordered.map((p) => {
            const f = fOf[p.id];
            return (
              <div key={p.id} className="rounded-2xl bg-surface p-3" style={{ borderTop: `4px solid ${p.avatar_color}` }}>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="mt-1 text-xs text-muted">КП ({f?.proposals ?? 0})</div>
                <div className="font-display tabular text-2xl">{fmtUsd(Number(f?.proposal_sum ?? 0))}</div>
                <div className="mt-1 text-xs text-muted">Сделки ({f?.deals ?? 0})</div>
                <div className="font-display tabular text-2xl font-bold text-good">{fmtUsd(Number(f?.deal_sum ?? 0))}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Что работает */}
      <Section title="Что работает" hint="топ-3 отрасль + оффер по конверсии разговора во встречу, от 3 разговоров">
        <div className="space-y-3">
          {regions.map((r) => {
            const rows = (works ?? []).filter((w) => w.region === r);
            const p = players.find((x) => x.region_label === r);
            return (
              <div key={r} className="rounded-2xl bg-surface p-4">
                <div className="mb-2 font-bold" style={{ color: p?.avatar_color }}>📍 {r}</div>
                {rows.length ? (
                  <ol className="space-y-1.5">
                    {rows.map((w) => (
                      <li key={`${w.industry}-${w.offer}`} className="flex items-center gap-2 text-sm">
                        <span className="font-display text-lg text-muted">{w.rank}</span>
                        <span className="flex-1"><b>{w.industry}</b> × {w.offer ? OFFER_LABEL[w.offer as OfferType] : "без оффера"}</span>
                        <span className="tabular"><b>{Math.round(Number(w.conv) * 100)}%</b> <span className="text-muted">({w.meetings}/{w.talks})</span></span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">Мало данных: нужно хотя бы 3 разговора и 1 встреча в комбинации.</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Все разрезы">
        <details className="rounded-2xl bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">Таблица отрасль × оффер × регион</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs tabular">
              <thead className="text-muted">
                <tr><th className="py-1">Регион</th><th>Отрасль</th><th>Оффер</th><th className="text-right">Разг.</th><th className="text-right">Встр.</th><th className="text-right">Конв.</th></tr>
              </thead>
              <tbody>
                {[...(segments ?? [])].sort((a, b) => b.talks! - a.talks!).map((s) => (
                  <tr key={`${s.region}-${s.industry}-${s.offer}`} className="border-t border-border">
                    <td className="py-1">{s.region}</td><td>{s.industry}</td>
                    <td>{s.offer ? OFFER_LABEL[s.offer as OfferType] : "—"}</td>
                    <td className="text-right">{s.talks}</td><td className="text-right">{s.meetings}</td>
                    <td className="text-right">{Math.round(Number(s.conv) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      <Section title="Лучшее время для звонков" hint="конверсия набора в живой разговор, местное время игрока">
        <HeatMap players={ordered} cells={(heat ?? []) as never} />
      </Section>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </section>
  );
}
