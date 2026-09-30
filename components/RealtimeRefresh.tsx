"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Любое изменение действий/очков у любого игрока → мягко перерисовать серверные данные. */
export function RealtimeRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel("arena")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "score_ledger" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_sessions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_participants" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "player_achievements" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, refresh)
      .subscribe((status, err) => {
        if (process.env.NODE_ENV !== "production") console.log("[realtime]", status, err?.message ?? "");
      });
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
