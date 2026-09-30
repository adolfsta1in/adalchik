import Link from "next/link";
import { STATUSES, STATUS_LABEL, type LeadStatus } from "@/lib/game";
import { getSession } from "@/lib/session";

const PAGE = 100;

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { supabase, me, players } = await getSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? (sp.status as LeadStatus) : null;
  const owner = sp.owner === "all" ? "all" : "me";
  const limit = Math.min(1000, Number(sp.limit) || PAGE);

  let query = supabase.from("leads").select("*", { count: "exact" });
  if (owner === "me") query = query.eq("owner_id", me.id);
  if (status) query = query.eq("status", status);
  const s = q.trim().replace(/[%,()]/g, " ");
  if (s) query = query.or(`company.ilike.%${s}%,contact_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%,industry.ilike.%${s}%`);
  const { data: leads, count } = await query
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const colorOf = Object.fromEntries(players.map((p) => [p.id, p.avatar_color]));
  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { q, status, owner, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "owner" && v === "me")) params.set(k, v);
    const str = params.toString();
    return str ? `/leads?${str}` : "/leads";
  };

  return (
    <main className="px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Лиды</h1>
        <div className="flex gap-2">
          <Link href="/leads/new" className="rounded-full bg-surface-2 px-3.5 py-2 text-sm font-semibold">+ Лид</Link>
          <Link href="/leads/import" className="rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-bg">Импорт CSV</Link>
        </div>
      </header>

      <form action="/leads" className="mb-3 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {owner === "all" && <input type="hidden" name="owner" value="all" />}
        <input name="q" defaultValue={q} placeholder="Поиск: компания, телефон, город…"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 outline-none" />
      </form>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href({ owner: owner === "me" ? "all" : "me" })} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold">
          {owner === "me" ? "👤 Мои" : "👥 Все"}
        </Link>
        <Link href={href({ status: null })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${!status ? "bg-accent text-bg" : "bg-surface-2"}`}>
          Все статусы
        </Link>
        {STATUSES.map((st) => (
          <Link key={st.value} href={href({ status: st.value })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${status === st.value ? "bg-accent text-bg" : "bg-surface-2"}`}>
            {st.label}
          </Link>
        ))}
      </div>

      <p className="mb-2 text-xs text-muted">Найдено: {count ?? 0}</p>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {(leads ?? []).map((l) => (
          <li key={l.id}>
            <Link href={`/leads/${l.id}`} className="flex items-center gap-3 px-3 py-3 active:bg-surface-2">
              <i className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorOf[l.owner_id] }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.company}</span>
                <span className="block truncate text-xs text-muted">{[l.contact_name, l.industry, l.city].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.status === "won" ? "bg-good/20 text-good" : l.status === "lost" ? "bg-bad/15 text-bad" : "bg-surface-2"}`}>
                {STATUS_LABEL[l.status]}
              </span>
            </Link>
          </li>
        ))}
        {!leads?.length && (
          <li className="p-8 text-center text-sm text-muted">
            Лидов нет. <Link href="/leads/import" className="underline">Импортируйте CSV</Link> из Google Sheets.
          </li>
        )}
      </ul>
      {(count ?? 0) > limit && (
        <Link href={href({ limit: String(limit + PAGE) })} className="mt-3 block rounded-xl bg-surface-2 py-3 text-center text-sm font-semibold">
          Показать ещё
        </Link>
      )}
    </main>
  );
}
