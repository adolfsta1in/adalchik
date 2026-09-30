import Link from "next/link";
import { MarkRead, PushToggle } from "@/components/NotificationControls";
import { NOTE_ICON as ICON, fmtTime } from "@/lib/game";
import { getSession } from "@/lib/session";

export default async function NotificationsPage() {
  const { supabase, me, players } = await getSession();
  const { data: items } = await supabase
    .from("notifications")
    .select("*")
    .eq("player_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const unread = (items ?? []).some((n) => !n.read_at);

  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/" className="text-sm text-muted">← Арена</Link>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Уведомления</h1>
      <PushToggle />
      {unread && <MarkRead playerId={me.id} />}
      <ul className="space-y-1.5">
        {(items ?? []).map((n) => {
          const actor = n.actor_id ? byId[n.actor_id] : null;
          return (
            <li key={n.id}>
              <Link href={n.link ?? "/"} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${n.read_at ? "bg-surface" : "bg-surface ring-2"}`}
                style={n.read_at ? undefined : { ["--tw-ring-color" as string]: actor?.avatar_color ?? "var(--text)" }}>
                <span className="text-2xl">{ICON[n.kind] ?? "🔔"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                </span>
                <span className="text-xs text-muted">
                  {new Date(n.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: me.timezone })}
                  <br />{fmtTime(n.created_at, me.timezone)}
                </span>
              </Link>
            </li>
          );
        })}
        {!items?.length && <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">Пока ничего. Брат молчит 🤫</li>}
      </ul>
    </main>
  );
}
