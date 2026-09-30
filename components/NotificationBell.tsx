import Link from "next/link";

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link href="/notifications" aria-label="Уведомления" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xl">
      🔔
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
