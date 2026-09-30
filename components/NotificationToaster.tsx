"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NOTE_ICON } from "@/lib/game";

type Note = { id: number; kind: string; title: string; body: string | null; link: string | null };

/** Живые уведомления от соперника: всплывашка в приложении + системное, если вкладка в фоне. */
export function NotificationToaster({ playerId, color }: { playerId: string; color: string }) {
  const [items, setItems] = useState<Note[]>([]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`notes-${playerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `player_id=eq.${playerId}` },
        (payload) => {
          const n = payload.new as Note;
          setItems((cur) => [n, ...cur].slice(0, 3));
          navigator.vibrate?.([40, 60, 40]);
          setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== n.id)), 7000);
          if (document.visibilityState === "hidden") showSystem(n);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] mx-auto flex max-w-xl flex-col gap-2 px-3 pt-safe">
      {items.map((n) => (
        <Link key={n.id} href={n.link ?? "/notifications"} onClick={() => setItems((c) => c.filter((x) => x.id !== n.id))}
          className="animate-slide pointer-events-auto mt-2 flex items-center gap-3 rounded-2xl bg-[#0c0d10] px-4 py-3 text-white shadow-2xl"
          style={{ borderLeft: `5px solid ${color}` }}>
          <span className="text-2xl">{NOTE_ICON[n.kind] ?? "🔔"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{n.title}</span>
            {n.body && <span className="block truncate text-xs opacity-70">{n.body}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}

async function showSystem(n: Note) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body: n.body ?? "", icon: "/pwa-icon/192", tag: `note-${n.id}`, data: { link: n.link ?? "/" } };
    if (reg) await reg.showNotification(n.title, opts);
    else new Notification(n.title, opts);
  } catch {}
}
