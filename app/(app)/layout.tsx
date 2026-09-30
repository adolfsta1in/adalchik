import { AchievementPopup } from "@/components/AchievementPopup";
import { BottomNav } from "@/components/BottomNav";
import { NotificationToaster } from "@/components/NotificationToaster";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, me } = await getSession();
  const { data: fresh } = await supabase
    .from("player_achievements")
    .select("code, achievements(title, description, icon)")
    .eq("player_id", me.id)
    .eq("seen", false)
    .order("earned_at");

  const items = (fresh ?? []).map((a) => ({ code: a.code, ...a.achievements! }));

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28 pt-safe" style={{ ["--me" as string]: me.avatar_color }}>
      {children}
      <BottomNav />
      <RealtimeRefresh />
      <NotificationToaster playerId={me.id} color={me.avatar_color} />
      {items.length > 0 && <AchievementPopup key={items.map((i) => i.code).join()} items={items} playerId={me.id} color={me.avatar_color} />}
    </div>
  );
}
