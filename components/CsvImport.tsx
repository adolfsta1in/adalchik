"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const TARGETS = [
  { key: "company", label: "Компания", required: true, guess: ["company", "компания", "название", "организация", "name", "business", "фирма"] },
  { key: "contact_name", label: "Контакт", guess: ["contact", "контакт", "имя", "фио", "лпр", "person"] },
  { key: "phone", label: "Телефон", guess: ["phone", "телефон", "тел", "номер", "mobile", "whatsapp"] },
  { key: "industry", label: "Отрасль", guess: ["industry", "отрасль", "сфера", "ниша", "категория", "category", "sector"] },
  { key: "city", label: "Город", guess: ["city", "город", "location", "town", "регион"] },
  { key: "notes", label: "Заметки", guess: ["notes", "заметки", "комментарий", "comment", "описание", "сайт", "website"] },
] as const;
type TargetKey = (typeof TARGETS)[number]["key"];

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function CsvImport() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<TargetKey, string>>({} as Record<TargetKey, string>);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hs);
        setRows(res.data);
        const guessed = {} as Record<TargetKey, string>;
        for (const t of TARGETS) {
          const h = hs.find((h) => t.guess.some((g) => h.toLowerCase().includes(g)));
          if (h && !Object.values(guessed).includes(h)) guessed[t.key] = h;
        }
        setMap(guessed);
      },
    });
  }

  const mapped = rows
    .map((r) => Object.fromEntries(TARGETS.map((t) => [t.key, map[t.key] ? (r[map[t.key]] ?? "").trim() || null : null])))
    .filter((r) => r.company) as Record<TargetKey, string | null>[];

  const run = () =>
    start(async () => {
      const supabase = supabaseBrowser();
      // существующие телефоны — чтобы не плодить дубликаты
      const known = new Set<string>();
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from("leads").select("phone").not("phone", "is", null).range(from, from + 999);
        data?.forEach((d) => digits(d.phone) && known.add(digits(d.phone)));
        if (!data || data.length < 1000) break;
      }
      const batch = crypto.randomUUID();
      const fresh = mapped.filter((r) => {
        const d = digits(r.phone);
        if (!d) return true;
        if (known.has(d)) return false;
        known.add(d);
        return true;
      });
      let inserted = 0;
      for (let i = 0; i < fresh.length; i += 500) {
        const chunk = fresh.slice(i, i + 500).map((r) => ({ ...r, company: r.company!, import_batch: batch }));
        const { error } = await supabase.from("leads").insert(chunk);
        if (error) {
          setResult(`Ошибка после ${inserted}: ${error.message}`);
          return;
        }
        inserted += chunk.length;
      }
      setResult(`Импортировано: ${inserted}. Пропущено дубликатов: ${mapped.length - fresh.length}. Без компании: ${rows.length - mapped.length}.`);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-6 text-center">
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <span className="text-3xl">📄</span>
        <span className="mt-1 block font-semibold">{rows.length ? `Строк: ${rows.length}. Выбрать другой файл` : "Выберите CSV-файл"}</span>
      </label>

      {headers.length > 0 && (
        <>
          <section className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Сопоставление колонок</h2>
            {TARGETS.map((t) => (
              <label key={t.key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{t.label}{"required" in t && t.required ? " *" : ""}</span>
                <select value={map[t.key] ?? ""} onChange={(e) => setMap({ ...map, [t.key]: e.target.value })}
                  className="w-1/2 rounded-lg border border-border bg-bg px-2 py-2 text-sm">
                  <option value="">— не импортировать —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Предпросмотр</h2>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2">
                  <tr>{TARGETS.map((t) => <th key={t.key} className="px-2 py-1.5">{t.label}</th>)}</tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {TARGETS.map((t) => <td key={t.key} className="max-w-32 truncate px-2 py-1.5">{r[t.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <button disabled={pending || !map.company || !mapped.length} onClick={run}
            className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-bg disabled:opacity-40">
            {pending ? "Импортирую…" : `Импортировать ${mapped.length}`}
          </button>
        </>
      )}
      {result && <p className="rounded-xl bg-surface-2 p-3 text-sm">{result}</p>}
    </div>
  );
}
