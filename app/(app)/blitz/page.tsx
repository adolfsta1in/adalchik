import Link from "next/link";
import { BlitzBoard, StartBlitz } from "@/components/BlitzBoard";
import { activeBlitz } from "@/lib/game-state";
import { getSession } from "@/lib/session";

export default async function BlitzPage() {
  const { supabase, me, players } = await getSession();
  const blitz = await activeBlitz(supabase);
  const { data: score } = blitz ? await supabase.rpc("blitz_score", { p_id: blitz.id! }) : { data: null };
  const { data: settings } = await supabase.from("app_settings").select("blitz_multiplier").single();
  const mult = Number(settings?.blitz_multiplier ?? 2);

  if (blitz)
    return <BlitzBoard blitz={blitz} players={players} meId={me.id} score={score ?? []} mult={mult} />;

  return (
    <main className="space-y-5 px-4 pt-4">
      <Link href="/more" className="text-sm text-muted">← Ещё</Link>
      <header>
        <h1 className="font-display text-4xl font-bold uppercase">⚡ Power Hour</h1>
        <p className="mt-1 text-muted">60 минут, все очки ×{mult}. Второй игрок получит приглашение.</p>
      </header>
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Окно пересечения</div>
        <div className="flex justify-between font-display text-2xl tabular">
          <span>13:00–18:00 <span className="text-sm text-muted">Бишкек</span></span>
        </div>
        <div className="flex justify-between font-display text-2xl tabular">
          <span>10:00–15:00 <span className="text-sm text-muted">Найроби</span></span>
        </div>
        <OverlapNow />
      </section>
      <StartBlitz color={me.avatar_color} />
    </main>
  );
}

function OverlapNow() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Bishkek" }).format(new Date()));
  const inside = hour >= 13 && hour < 18;
  return (
    <p className={`mt-3 text-sm font-semibold ${inside ? "text-good" : "text-muted"}`}>
      {inside ? "✓ Сейчас оба в рабочем окне, самое время для блица" : "Сейчас вне общего окна, но блиц можно запустить в любое время"}
    </p>
  );
}
