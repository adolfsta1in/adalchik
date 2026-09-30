"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Арена", icon: "🏟️" },
  { href: "/leads", label: "Лиды", icon: "📇" },
  { href: "/call", label: "Звоню", icon: "📞", main: true },
  { href: "/week", label: "Итоги", icon: "🏆" },
  { href: "/more", label: "Ещё", icon: "⚙️" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md pb-safe">
      <ul className="mx-auto grid max-w-xl grid-cols-5 items-end px-2 pt-1.5">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          if (it.main)
            return (
              <li key={it.href} className="flex justify-center">
                <Link href={it.href}
                  className="-mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full text-2xl shadow-lg ring-4 ring-bg active:scale-95 transition"
                  style={{ background: "var(--me)" }} aria-label={it.label}>
                  {it.icon}
                  <span className="text-[10px] font-bold text-white">{it.label}</span>
                </Link>
              </li>
            );
          return (
            <li key={it.href}>
              <Link href={it.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${active ? "text-text" : "text-muted"}`}>
                <span className={`text-xl ${active ? "" : "grayscale opacity-70"}`}>{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
