"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { STATUSES, type Lead, type LeadStatus } from "@/lib/game";

const FIELDS = [
  { key: "company", label: "Компания *" },
  { key: "contact_name", label: "Контакт" },
  { key: "phone", label: "Телефон" },
  { key: "industry", label: "Отрасль" },
  { key: "city", label: "Город" },
] as const;

export function LeadForm({ lead, canDelete }: { lead?: Lead; canDelete?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    company: lead?.company ?? "",
    contact_name: lead?.contact_name ?? "",
    phone: lead?.phone ?? "",
    industry: lead?.industry ?? "",
    city: lead?.city ?? "",
    notes: lead?.notes ?? "",
    status: (lead?.status ?? "new") as LeadStatus,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setMsg(null);
      if (!form.company.trim()) return setMsg("Укажите компанию");
      const row = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && k !== "status" ? v.trim() || null : v]),
      ) as typeof form;
      const supabase = supabaseBrowser();
      const { data, error } = lead
        ? await supabase.from("leads").update(row).eq("id", lead.id).select("id").single()
        : await supabase.from("leads").insert(row).select("id").single();
      if (error) return setMsg(error.message);
      if (!lead) router.replace(`/leads/${data.id}`);
      else {
        setMsg("Сохранено");
        router.refresh();
      }
    });

  const remove = () =>
    start(async () => {
      if (!lead || !confirm("Удалить лида?")) return;
      const { error } = await supabaseBrowser().from("leads").delete().eq("id", lead.id);
      if (error) return setMsg(error.message);
      router.replace("/leads");
    });

  const input = "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-text";
  return (
    <div className="space-y-2.5">
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="mb-1 block text-xs text-muted">{f.label}</span>
          <input className={input} value={form[f.key]} inputMode={f.key === "phone" ? "tel" : undefined}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </label>
      ))}
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Статус (обычно меняется сам)</span>
        <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Заметки</span>
        <textarea className={input} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button disabled={pending} onClick={save} className="w-full rounded-2xl bg-accent py-3.5 font-bold text-bg disabled:opacity-50">
        {lead ? "Сохранить" : "Добавить лида"}
      </button>
      {canDelete && (
        <button disabled={pending} onClick={remove} className="w-full py-2 text-sm text-bad">Удалить лида</button>
      )}
    </div>
  );
}
