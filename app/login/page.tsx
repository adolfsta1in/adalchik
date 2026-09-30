import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 pt-safe">
      <div className="mb-10">
        <div className="mb-4 flex h-3 overflow-hidden rounded-full">
          <div className="flex-1 bg-[#f97316]" />
          <div className="flex-1 bg-[#0ea5e9]" />
        </div>
        <h1 className="font-display text-5xl font-bold uppercase leading-none">Cold Call<br />Arena</h1>
        <p className="mt-3 text-muted">Бишкек vs Найроби. Каждый звонок — очко.</p>
      </div>
      {error === "forbidden" && <p className="mb-4 rounded-xl bg-bad/15 p-3 text-sm text-bad">Этот аккаунт не допущен в арену.</p>}
      {error === "noplayer" && <p className="mb-4 rounded-xl bg-bad/15 p-3 text-sm text-bad">Профиль игрока не найден. Проверьте миграции.</p>}
      {error === "link" && <p className="mb-4 rounded-xl bg-bad/15 p-3 text-sm text-bad">Ссылка устарела. Запросите новый код.</p>}
      <LoginForm />
    </main>
  );
}
