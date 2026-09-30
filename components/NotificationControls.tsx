"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Отмечает всё прочитанным при открытии страницы. */
export function MarkRead({ playerId }: { playerId: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(async () => {
      await supabaseBrowser().from("notifications").update({ read_at: new Date().toISOString() })
        .eq("player_id", playerId).is("read_at", null);
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [playerId, router]);
  return null;
}

type Perm = "default" | "granted" | "denied" | "unsupported";

export function PushToggle() {
  const [perm, setPerm] = useState<Perm | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setPerm("Notification" in window ? (Notification.permission as Perm) : "unsupported"), 0);
    return () => clearTimeout(t);
  }, []);
  if (perm === null || perm === "granted") return null;
  if (perm === "unsupported")
    return <p className="rounded-2xl bg-surface-2 p-3 text-xs text-muted">На iPhone системные уведомления работают, если приложение добавлено на главный экран.</p>;
  if (perm === "denied")
    return <p className="rounded-2xl bg-surface-2 p-3 text-xs text-muted">Системные уведомления запрещены в настройках браузера.</p>;
  return (
    <button onClick={async () => setPerm((await Notification.requestPermission()) as Perm)}
      className="w-full rounded-2xl bg-surface-2 py-3 text-sm font-semibold">
      🔔 Включить системные уведомления
    </button>
  );
}
