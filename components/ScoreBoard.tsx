import { plural, type Player } from "@/lib/game";

export function ScoreBoard({ scores, meId }: { scores: { player: Player; points: number }[]; meId: string }) {
  const ordered = [...scores].sort((a, b) => (a.player.id === meId ? -1 : b.player.id === meId ? 1 : 0));
  const [a, b] = ordered;
  const total = Math.max(1, (a?.points ?? 0) + (b?.points ?? 0));
  const diff = (a?.points ?? 0) - (b?.points ?? 0);

  return (
    <section className="overflow-hidden rounded-3xl bg-[#0c0d10] text-white shadow-xl">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        {ordered.map((s, i) => (
          <div key={s.player.id} className={`relative px-4 pb-4 pt-3 ${i === 1 ? "order-3 text-right" : ""}`}
            style={{ background: `linear-gradient(${i === 0 ? "135deg" : "225deg"}, ${s.player.avatar_color}55, transparent 70%)` }}>
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">
              {s.player.id === meId ? "Я" : s.player.name}
            </div>
            <div className="text-[11px] opacity-60">{s.player.region_label}</div>
            <div key={s.points} className="animate-bump font-display tabular text-7xl font-bold leading-none mt-2"
              style={{ color: s.player.avatar_color }}>
              {s.points}
            </div>
          </div>
        ))}
        <div className="order-2 flex items-center px-1 font-display text-lg font-bold opacity-50">VS</div>
      </div>
      {b && (
        <>
          <div className="flex h-2">
            <div style={{ width: `${(a.points / total) * 100}%`, background: a.player.avatar_color }} className="transition-all duration-700" />
            <div style={{ width: `${(b.points / total) * 100}%`, background: b.player.avatar_color }} className="transition-all duration-700" />
          </div>
          <p className="px-4 py-2.5 text-center text-sm font-semibold">
            {diff === 0
              ? "Ничья. Следующий звонок решит."
              : diff > 0
                ? `Ты впереди на ${diff} ${plural(diff, ["очко", "очка", "очков"])} 🔥`
                : `${b.player.name} впереди на ${-diff} ${plural(-diff, ["очко", "очка", "очков"])}. Догоняй!`}
          </p>
        </>
      )}
    </section>
  );
}
