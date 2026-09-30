import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import { ACTION_BY_TYPE, FEED_VERB, OFFER_LABEL, STATUS_LABEL, fmtTime, fmtUsd } from "@/lib/game";
import { getSession } from "@/lib/session";

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const { supabase, me, players } = await getSession();
  const [{ data: lead }, { data: history }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (!lead) notFound();
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const owner = byId[lead.owner_id];

  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/leads" className="text-sm text-muted">← Лиды</Link>
      <header>
        <h1 className="text-2xl font-bold">{lead.company}</h1>
        <p className="text-sm text-muted">
          {STATUS_LABEL[lead.status]} · владелец <b style={{ color: owner?.avatar_color }}>{owner?.name}</b>
        </p>
      </header>

      <Link href={`/call?lead=${lead.id}`} className="block rounded-2xl py-4 text-center text-lg font-bold text-white" style={{ background: me.avatar_color }}>
        📞 Звонить этому лиду
      </Link>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">История</h2>
        {history?.length ? (
          <ul className="space-y-1.5">
            {history.map((a) => {
              const p = byId[a.player_id];
              return (
                <li key={a.id} className={`flex items-center gap-3 rounded-xl bg-surface px-3 py-2 text-sm ${a.voided_at ? "opacity-40 line-through" : ""}`}>
                  <span>{ACTION_BY_TYPE[a.type].icon}</span>
                  <span className="flex-1">
                    <b style={{ color: p?.avatar_color }}>{p?.name}</b> {FEED_VERB[a.type]}
                    {a.deal_value ? ` · ${fmtUsd(a.deal_value)}` : ""}
                    {a.offer ? ` · ${OFFER_LABEL[a.offer]}` : ""}
                    {a.note ? <span className="block text-xs text-muted">{a.note}</span> : null}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(a.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: me.timezone })}{" "}
                    {fmtTime(a.created_at, me.timezone)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Пока ни одного действия.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Данные</h2>
        <LeadForm lead={lead} canDelete={lead.owner_id === me.id && !history?.length} />
      </section>
    </main>
  );
}
