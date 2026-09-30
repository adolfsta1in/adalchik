import { BottomNav } from "@/components/BottomNav";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { me } = await getSession();
  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28 pt-safe" style={{ ["--me" as string]: me.avatar_color }}>
      {children}
      <BottomNav />
      <RealtimeRefresh />
    </div>
  );
}
