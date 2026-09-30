"use client";

import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sendLoginCode } from "./actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      const res = await sendLoginCode(email);
      if (res.ok) setSent(true);
      else setError(res.error ?? "Ошибка");
    });

  const verify = () =>
    start(async () => {
      setError(null);
      const { error } = await supabaseBrowser().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (error) setError("Неверный или просроченный код");
      else window.location.replace("/");
    });

  const input = "w-full rounded-2xl border border-border bg-surface px-4 py-4 text-lg outline-none focus:border-text";
  const button = "w-full rounded-2xl bg-accent py-4 text-lg font-bold text-bg disabled:opacity-50";

  return (
    <div className="space-y-3">
      {!sent ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3">
          <input className={input} type="email" inputMode="email" autoComplete="email" required
            placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={button} disabled={pending || !email}>{pending ? "Отправляю…" : "Получить код"}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <p className="text-sm text-muted">
            Отправили письмо на <b className="text-text">{email}</b>. Введите код из письма или откройте ссылку.
          </p>
          <input className={`${input} text-center font-display text-3xl tracking-[0.4em]`} inputMode="numeric"
            autoComplete="one-time-code" maxLength={10} placeholder="••••••" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          <button className={button} disabled={pending || code.length < 6}>{pending ? "Проверяю…" : "Войти"}</button>
          <button type="button" className="w-full py-2 text-sm text-muted" onClick={() => { setSent(false); setCode(""); }}>
            Другой email
          </button>
        </form>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
