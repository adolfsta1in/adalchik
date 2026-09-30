"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const read = (): Theme => {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
};
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function apply(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  } catch {}
  const resolved = t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  document.documentElement.dataset.theme = resolved;
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const opts: { v: Theme; l: string }[] = [
    { v: "light", l: "☀️ Светлая" },
    { v: "dark", l: "🌙 Тёмная" },
    { v: "system", l: "📱 Как в системе" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
      {opts.map((o) => (
        <button key={o.v} onClick={() => apply(o.v)}
          className={`rounded-xl py-2.5 text-sm font-semibold ${theme === o.v ? "bg-surface shadow" : "text-muted"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
