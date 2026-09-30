"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AddObjection() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex gap-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const { error } = await supabaseBrowser().from("objections").insert({ text: text.trim() });
        if (error) return setErr(error.code === "23505" ? "Такое возражение уже есть" : error.message);
        setText(""); setErr(null); router.refresh();
      });
    }}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Новое возражение"
        className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 outline-none" />
      <button disabled={pending || !text.trim()} className="rounded-xl bg-accent px-4 font-bold text-bg disabled:opacity-40">+</button>
      {err && <p className="text-sm text-bad">{err}</p>}
    </form>
  );
}

export function AddScript({ objectionId }: { objectionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return <button onClick={() => setOpen(true)} className="mt-2 text-sm font-semibold text-muted">+ скрипт-ответ</button>;
  return (
    <div className="mt-2 space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus
        placeholder="Что отвечать на это возражение"
        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none" />
      <div className="flex gap-2">
        <button disabled={pending || !text.trim()} className="flex-1 rounded-xl bg-accent py-2 text-sm font-bold text-bg disabled:opacity-40"
          onClick={() => start(async () => {
            await supabaseBrowser().from("scripts").insert({ objection_id: objectionId, text: text.trim() });
            setText(""); setOpen(false); router.refresh();
          })}>
          Сохранить
        </button>
        <button onClick={() => setOpen(false)} className="px-3 text-sm text-muted">Отмена</button>
      </div>
    </div>
  );
}
