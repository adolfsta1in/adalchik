"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ACTIONS, OFFERS, STATUS_LABEL, fmtUsd,
  type ActivityType, type Lead, type OfferType, type Player,
} from "@/lib/game";
import type { Database } from "@/lib/database.types";
import { UndoButton } from "@/components/Feed";
import { fmtClock, useCountdown } from "@/components/useCountdown";

type Rule = { type: ActivityType; points: number; usd_step: number | null; step_points: number };
type Stats = Database["public"]["Views"]["v_daily_stats"]["Row"] | null;
type Script = { id: string; objection_id: string; text: string; author_id: string };
type Recent = { id: string; type: ActivityType; points: number; created_at: string; leads: { company: string } | null };

export function CallScreen(props: {
  me: Player;
  queue: Lead[];
  initialLead: Lead | null;
  industries: string[];
  objections: { id: string; text: string }[];
  scripts: Script[];
  rules: Rule[];
  stats: Stats;
  recent: Recent[];
  lastOffer: OfferType | null;
  undoMinutes: number;
  dailyMin: number;
  blitz: { endsAt: string; mult: number } | null;
  quest: { title: string | null; progress: number | null; target: number | null; done: boolean | null } | null;
}) {
  const { me, rules, stats } = props;
  const router = useRouter();
  const [queue, setQueue] = useState(props.queue);
  const [lead, setLead] = useState<Lead | null>(props.initialLead ?? props.queue[0] ?? null);
  const [sheet, setSheet] = useState<ActivityType | null>(null);
  const [picker, setPicker] = useState(false);
  const [toast, setToast] = useState<{ id: string; text: string; at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<OfferType | null>(props.lastOffer);
  const [pending, start] = useTransition();

  const ruleBy = useMemo(() => Object.fromEntries(rules.map((r) => [r.type, r])), [rules]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const reloadLead = async (id = lead?.id) => {
    if (!id) return;
    const { data } = await supabaseBrowser().from("leads").select("*").eq("id", id).single();
    if (data) setLead((cur) => (cur?.id === data.id ? data : cur));
  };

  const nextLead = () => {
    const rest = queue.filter((l) => l.id !== lead?.id);
    setQueue(rest);
    setLead(rest[0] ?? null);
  };

  async function log(type: ActivityType, extra: Partial<Database["public"]["Tables"]["activities"]["Insert"]> = {}) {
    setError(null);
    const needsLead = ACTIONS.find((a) => a.type === type)!.needsLead;
    if (needsLead && !lead) {
      setError("Сначала выберите лида");
      return;
    }
    start(async () => {
      const { data, error } = await supabaseBrowser()
        .from("activities")
        .insert({ type, lead_id: lead?.id ?? null, ...extra })
        .select("id, points")
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      if (extra.offer) setOffer(extra.offer);
      navigator.vibrate?.(30);
      setSheet(null);
      setToast({ id: data.id, at: new Date().toISOString(), text: `${ACTIONS.find((a) => a.type === type)!.label} · +${data.points}` });
      // Недозвон или отказ — сразу к следующему лиду из очереди
      if (lead && (type === "call" || type === "rejection") && queue.some((l) => l.id === lead.id)) nextLead();
      else if (lead) {
        await reloadLead(lead.id);
      }
      router.refresh();
    });
  }

  const mult = props.blitz ? props.blitz.mult : 1;
  const dials = stats?.dials ?? 0;
  const progress = Math.min(100, (dials / props.dailyMin) * 100);

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col px-4 pt-4">
      {/* Сегодня */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold">Сегодня: <span className="font-display tabular text-xl">{dials}</span> / {props.dailyMin}</span>
            <span className="font-display tabular text-xl font-bold" style={{ color: me.avatar_color }}>{stats?.points ?? 0} оч.</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: me.avatar_color }} />
          </div>
        </div>
      </div>

      {props.blitz && <BlitzStrip endsAt={props.blitz.endsAt} mult={props.blitz.mult} />}
      {props.quest && (
        <p className="mb-3 truncate text-xs text-muted">
          🎯 Квест: <b className="text-text">{props.quest.title}</b> · {props.quest.done ? "✓ выполнен" : `${props.quest.progress}/${props.quest.target}`}
        </p>
      )}

      {/* Лид */}
      <section className="mb-4 rounded-3xl border border-border bg-surface p-4">
        {lead ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{lead.company}</h2>
                <p className="truncate text-sm text-muted">
                  {[lead.contact_name, lead.industry, lead.city].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">{STATUS_LABEL[lead.status]}</span>
            </div>
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl py-3 text-lg font-bold text-white active:scale-[0.98] transition"
                style={{ background: me.avatar_color }}>
                📞 {lead.phone}
              </a>
            )}
            {lead.notes && <p className="mt-2 line-clamp-2 text-xs text-muted">{lead.notes}</p>}
          </>
        ) : (
          <p className="py-3 text-center text-muted">Лид не выбран. Можно отметить недозвон без лида.</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-surface-2 py-2.5 text-sm font-semibold" onClick={() => setPicker(true)}>🔍 Выбрать лида</button>
          <button className="rounded-xl bg-surface-2 py-2.5 text-sm font-semibold disabled:opacity-40" disabled={queue.length === 0} onClick={nextLead}>
            Следующий → <span className="text-muted">({Math.max(0, queue.length - (lead && queue.some((l) => l.id === lead.id) ? 1 : 0))})</span>
          </button>
        </div>
      </section>

      {/* Кнопки действий */}
      <section className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((a) => {
          const r = ruleBy[a.type];
          const disabled = pending || (a.needsLead && !lead) ||
            (a.type === "meeting_held" && !!lead && !["meeting_set", "meeting_held", "proposal", "won"].includes(lead.status));
          const big = a.type === "call" || a.type === "conversation";
          return (
            <button key={a.type} disabled={disabled}
              onClick={() => (a.details ? setSheet(a.type) : log(a.type))}
              className={`flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 text-left transition active:scale-[0.97] disabled:opacity-35 ${big ? "min-h-20" : "min-h-16"}`}
              style={a.type === "meeting_set" || a.type === "deal" ? { borderColor: me.avatar_color, borderWidth: 2 } : undefined}>
              <span className={big ? "text-3xl" : "text-2xl"}>{a.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight">{a.label}</span>
                <span className="font-display tabular text-sm text-muted">+{Math.round((r?.points ?? 0) * mult)}{a.type === "deal" ? "+" : ""}</span>
              </span>
            </button>
          );
        })}
      </section>

      {error && <p className="mt-3 rounded-xl bg-bad/15 p-3 text-sm text-bad">{error}</p>}

      {/* Последние */}
      {props.recent.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Мои последние</h3>
          <ul className="space-y-1">
            {props.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span>{ACTIONS.find((a) => a.type === r.type)!.icon}</span>
                <span className="flex-1 truncate">{r.leads?.company ?? "без лида"}</span>
                <UndoButton id={r.id} createdAt={r.created_at} undoMinutes={props.undoMinutes} onDone={() => reloadLead()} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sheet && (
        <DetailsSheet
          type={sheet}
          lead={lead}
          me={me}
          industries={props.industries}
          objections={props.objections}
          scripts={props.scripts}
          defaultOffer={offer}
          rule={ruleBy[sheet]}
          pending={pending}
          onClose={() => setSheet(null)}
          onSubmit={(extra) => log(sheet, extra)}
        />
      )}

      {picker && (
        <LeadPicker
          onClose={() => setPicker(false)}
          onPick={(l) => {
            setLead(l);
            setPicker(false);
          }}
        />
      )}

      {toast && (
        <div className="animate-slide fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-[#0c0d10] px-4 py-3 text-white shadow-2xl">
          <span className="font-semibold">✓ {toast.text}</span>
          <UndoButton id={toast.id} createdAt={toast.at} undoMinutes={props.undoMinutes} onDone={() => { setToast(null); reloadLead(); }} />
        </div>
      )}
    </main>
  );
}

function BlitzStrip({ endsAt, mult }: { endsAt: string; mult: number }) {
  const left = useCountdown(endsAt);
  if (left === 0) return null;
  return (
    <a href="/blitz" className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#f97316] to-[#e11d48] px-4 py-2 text-white">
      <span className="font-display font-bold uppercase">⚡ Блиц ×{mult}</span>
      <span className="font-display tabular text-xl">{fmtClock(left)}</span>
    </a>
  );
}

function DetailsSheet(props: {
  type: ActivityType;
  lead: Lead | null;
  me: Player;
  industries: string[];
  objections: { id: string; text: string }[];
  scripts: Script[];
  defaultOffer: OfferType | null;
  rule?: Rule;
  pending: boolean;
  onClose: () => void;
  onSubmit: (extra: Partial<Database["public"]["Tables"]["activities"]["Insert"]>) => void;
}) {
  const { type, lead, me } = props;
  const action = ACTIONS.find((a) => a.type === type)!;
  const [industry, setIndustry] = useState<string | null>(lead?.industry ?? null);
  const [offer, setOffer] = useState<OfferType | null>(props.defaultOffer);
  const [objection, setObjection] = useState<string | null>(null);
  const [newObjection, setNewObjection] = useState("");
  const [script, setScript] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const industries = industry && !props.industries.includes(industry) ? [industry, ...props.industries] : props.industries;
  const dealPts = type === "deal" && props.rule?.usd_step
    ? props.rule.points + Math.floor((Number(amount) || 0) / props.rule.usd_step) * props.rule.step_points
    : props.rule?.points ?? 0;

  async function submit() {
    setErr(null);
    if (type === "deal" && !(Number(amount) > 0)) return setErr("Укажите сумму сделки");
    let objection_id = objection;
    if (newObjection.trim()) {
      const supabase = supabaseBrowser();
      const text = newObjection.trim();
      const { data: existing } = await supabase.from("objections").select("id").ilike("text", text).maybeSingle();
      const res = existing ?? (await supabase.from("objections").insert({ text }).select("id").single()).data;
      objection_id = res?.id ?? null;
    }
    props.onSubmit({
      industry,
      offer,
      deal_value: type === "deal" ? Number(amount) : null,
      objection_id,
      script_id: script,
      note: note.trim() || null,
    });
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-2 text-sm font-semibold transition ${active ? "border-transparent text-white" : "border-border bg-surface"}`;
  const chipStyle = (active: boolean) => (active ? { background: me.avatar_color } : undefined);

  // скрипты брата — первыми: за них он получает бонус
  const scripts = [...props.scripts].sort((a, b) => Number(a.author_id === me.id) - Number(b.author_id === me.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={props.onClose}>
      <div className="animate-slide max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-bg p-5 pb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        <h2 className="mb-1 text-2xl font-bold">{action.icon} {action.label}</h2>
        <p className="mb-4 text-sm text-muted">{lead?.company}</p>

        {type === "deal" && (
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">Сумма, USD</span>
            <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 font-display text-3xl tabular outline-none" placeholder="0" />
            {Number(amount) > 0 && <span className="mt-1 block text-sm text-muted">{fmtUsd(Number(amount))} → +{dealPts} очков</span>}
          </label>
        )}

        <Group title="Оффер">
          {OFFERS.map((o) => (
            <button key={o.value} className={chip(offer === o.value)} style={chipStyle(offer === o.value)} onClick={() => setOffer(offer === o.value ? null : o.value)}>
              {o.label}
            </button>
          ))}
        </Group>

        <Group title="Отрасль">
          {industries.map((i) => (
            <button key={i} className={chip(industry === i)} style={chipStyle(industry === i)} onClick={() => setIndustry(industry === i ? null : i)}>
              {i}
            </button>
          ))}
        </Group>

        {type === "rejection" && (
          <Group title="Возражение (необязательно)">
            {props.objections.map((o) => (
              <button key={o.id} className={chip(objection === o.id)} style={chipStyle(objection === o.id)} onClick={() => setObjection(objection === o.id ? null : o.id)}>
                {o.text}
              </button>
            ))}
            <input value={newObjection} onChange={(e) => setNewObjection(e.target.value)} placeholder="+ новое возражение"
              className="rounded-full border border-dashed border-border bg-transparent px-3.5 py-2 text-sm outline-none" />
          </Group>
        )}

        {type === "meeting_set" && scripts.length > 0 && (
          <Group title="Использовал скрипт?">
            {scripts.map((s) => (
              <button key={s.id} className={`${chip(script === s.id)} max-w-full truncate text-left`} style={chipStyle(script === s.id)}
                onClick={() => setScript(script === s.id ? null : s.id)}>
                {s.author_id !== me.id ? "🎓 " : ""}{s.text}
              </button>
            ))}
          </Group>
        )}

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Заметка (необязательно)"
          className="mb-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none" />

        {err && <p className="mb-3 text-sm text-bad">{err}</p>}
        <button disabled={props.pending} onClick={submit}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50"
          style={{ background: me.avatar_color }}>
          {props.pending ? "Записываю…" : `Записать · +${dealPts}`}
        </button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function LeadPicker({ onClose, onPick }: { onClose: () => void; onPick: (l: Lead) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Lead[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const supabase = supabaseBrowser();
      let query = supabase.from("leads").select("*").limit(40);
      const s = q.trim().replace(/[%,()]/g, " ");
      if (s) query = query.or(`company.ilike.%${s}%,contact_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%`);
      else query = query.order("last_activity_at", { ascending: false, nullsFirst: false });
      const { data } = await query;
      setItems(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-safe">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Компания, имя, телефон, город"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 outline-none" />
        <button onClick={onClose} className="px-3 py-3 font-semibold">Закрыть</button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {!q && <li className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted">Недавние</li>}
        {items.map((l) => (
          <li key={l.id}>
            <button onClick={() => onPick(l)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left active:bg-surface-2">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{l.company}</span>
                <span className="block truncate text-xs text-muted">{[l.contact_name, l.phone, l.city].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{STATUS_LABEL[l.status]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
