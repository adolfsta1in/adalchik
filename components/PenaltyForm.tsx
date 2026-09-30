"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function PenaltyForm({ week, text, locked }: { week: string; text: string; locked: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(text);
  const [pending, start] = useTransition();

  if (locked)
    return <p className="text-lg font-bold">{text || "Наказание не было задано 🤷"}</p>;

  return (
    <div className="space-y-2">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2}
        placeholder="Например: проигравший оплачивает ужин"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none" />
      <button disabled={pending || !value.trim() || value === text}
        className="w-full rounded-xl bg-bad py-2.5 font-bold text-white disabled:opacity-40"
        onClick={() => start(async () => {
          await supabaseBrowser().from("penalties").upsert({ week_start: week, text: value.trim() });
          router.refresh();
        })}>
        Утвердить наказание
      </button>
    </div>
  );
}
