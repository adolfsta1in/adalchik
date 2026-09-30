"use client";

import { useState, useTransition } from "react";
import { setFirstPassword, signInWithPassword } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      if (mode === "setup" && password !== password2) return setError("Пароли не совпадают");
      const res = mode === "login" ? await signInWithPassword(email, password) : await setFirstPassword(email, password);
      if (res.ok) window.location.replace("/");
      else setError(res.error ?? "Ошибка");
    });

  const input = "w-full rounded-2xl border border-border bg-surface px-4 py-4 text-lg outline-none focus:border-text";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {(["login", "setup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
            className={`rounded-xl py-2.5 text-sm font-semibold ${mode === m ? "bg-surface shadow" : "text-muted"}`}>
            {m === "login" ? "Вход" : "Первый вход"}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
        <input className={input} type="email" inputMode="email" autoComplete="email" required
          placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "login" ? "пароль" : "придумайте пароль (от 6 символов)"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "setup" && (
          <input className={input} type="password" required minLength={6} autoComplete="new-password"
            placeholder="повторите пароль" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        )}
        <button className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-bg disabled:opacity-50"
          disabled={pending || !email || password.length < 6}>
          {pending ? "Секунду…" : mode === "login" ? "Войти" : "Задать пароль и войти"}
        </button>
      </form>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
