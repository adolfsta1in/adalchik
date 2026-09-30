import { arenaIcon } from "@/lib/icon";

export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  const n = Math.min(1024, Math.max(32, Number(size) || 192));
  return arenaIcon(n);
}
