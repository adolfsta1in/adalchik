import Link from "next/link";
import { AddObjection, AddScript } from "@/components/ObjectionForms";
import { getSession } from "@/lib/session";

export default async function ObjectionsPage() {
  const { supabase, players, today } = await getSession();
  const args = { p_from: "2000-01-01", p_to: today.local_date! };
  const [{ data: objections }, { data: scripts }, { data: sstats }] = await Promise.all([
    supabase.rpc("objection_stats", args),
    supabase.from("scripts").select("*").order("created_at"),
    supabase.rpc("script_stats", args),
  ]);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const statOf = Object.fromEntries((sstats ?? []).map((s) => [s.script_id, s]));
  const max = Math.max(1, ...(objections ?? []).map((o) => o.total ?? 0));

  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/more" className="text-sm text-muted">← Ещё</Link>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Возражения и скрипты</h1>
      <p className="text-sm text-muted">
        Отмечайте возражение при отказе и скрипт при разговоре. Если твой скрипт принёс брату встречу — тебе +5 и значок «Учитель».
      </p>
      <AddObjection />

      <ul className="space-y-3">
        {(objections ?? []).map((o) => {
          const list = (scripts ?? [])
            .filter((s) => s.objection_id === o.objection_id)
            .sort((a, b) => Number(statOf[b.id]?.conv ?? 0) - Number(statOf[a.id]?.conv ?? 0));
          const per = (o.per_region ?? {}) as Record<string, number>;
          return (
            <li key={o.objection_id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">«{o.text}»</h2>
                <span className="font-display tabular text-2xl">{o.total}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-text/60" style={{ width: `${((o.total ?? 0) / max) * 100}%` }} />
              </div>
              {Object.keys(per).length > 0 && (
                <p className="mt-1 text-xs text-muted">{Object.entries(per).map(([r, c]) => `${r}: ${c}`).join(" · ")}</p>
              )}
              <ul className="mt-3 space-y-2">
                {list.map((s, i) => {
                  const st = statOf[s.id];
                  const author = byId[s.author_id];
                  return (
                    <li key={s.id} className="rounded-xl border border-border p-3 text-sm">
                      <p>{i === 0 && (st?.meetings ?? 0) > 0 ? "🥇 " : ""}{s.text}</p>
                      <p className="mt-1 text-xs text-muted">
                        <b style={{ color: author?.avatar_color }}>{author?.name}</b> · применён {st?.uses ?? 0} · встреч {st?.meetings ?? 0}
                        {st?.uses ? ` · ${Math.round(Number(st.conv) * 100)}%` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <AddScript objectionId={o.objection_id!} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
