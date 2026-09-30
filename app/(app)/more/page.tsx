import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { SettingsForm } from "@/components/SettingsForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/app/login/actions";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function MorePage() {
  const { supabase, me, today } = await getSession();
  const month = today.local_date!.slice(0, 8) + "01";
  const [{ data: rules }, { data: settings }, { data: goal }] = await Promise.all([
    supabase.from("scoring_rules").select("*").order("sort"),
    supabase.from("app_settings").select("*").single(),
    supabase.from("month_goals").select("*").eq("month", month).maybeSingle(),
  ]);

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <main className="space-y-6 px-4 pt-4">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Ещё</h1>

      <nav className="grid grid-cols-2 gap-2">
        {[
          { href: "/blitz", icon: "⚡", label: "Power Hour" },
          { href: "/seasons", icon: "👑", label: "Сезоны" },
          { href: "/achievements", icon: "🎖️", label: "Достижения" },
          { href: "/analytics", icon: "📊", label: "Аналитика" },
          { href: "/objections", icon: "🛡️", label: "Возражения и скрипты" },
          { href: "/week", icon: "🏆", label: "Итоги недель" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-2xl bg-surface p-4 font-semibold active:scale-[0.98]">
            <span className="text-2xl">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>

      <Section title="Профиль">
        <ProfileForm me={me} />
      </Section>

      <Section title="Тема">
        <ThemeToggle />
      </Section>

      <Section title="Правила и цели (общие для двоих)" id="goal">
        <SettingsForm rules={rules ?? []} settings={settings!} month={month} goal={goal} />
      </Section>

      <form action={logout}>
        <button className="w-full rounded-2xl border border-border py-3 font-semibold text-bad">Выйти</button>
      </form>
    </main>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}
