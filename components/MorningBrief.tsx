"use client";

import { useEffect, useState } from "react";
import { plural } from "@/lib/game";

/** «Утреннее сообщение»: брифинг при первом открытии за день (по локальной дате игрока). */
export function MorningBrief(props: {
  date: string;
  name: string;
  quest: { title: string; description: string } | null;
  myPoints: number;
  rivalPoints: number | null;
  rivalName: string | null;
  streak: number;
  todayDone: boolean;
  minCalls: number;
}) {
  const key = `brief-${props.date}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setShow(localStorage.getItem(key) !== "1");
      } catch {
        setShow(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [key]);

  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setShow(false);
  };
  const diff = props.rivalPoints == null ? 0 : props.myPoints - props.rivalPoints;

  return (
    <section className="animate-slide relative rounded-2xl border border-gold/50 bg-gold/10 p-4">
      <button onClick={dismiss} aria-label="Скрыть" className="absolute right-2 top-2 h-8 w-8 rounded-full text-muted">✕</button>
      <div className="mb-2 font-display text-lg font-bold uppercase">☀️ Брифинг дня, {props.name}</div>
      <ul className="space-y-1.5 text-sm">
        {props.quest && <li>🎯 Квест: <b>{props.quest.title}</b>. {props.quest.description}</li>}
        {props.rivalName && (
          <li>
            ⚔️ Неделя: <b>{props.myPoints}</b> : {props.rivalPoints}{" "}
            {diff > 0 ? `— ты впереди на ${diff}` : diff < 0 ? `— ${props.rivalName} впереди на ${-diff}` : "— ничья"}
          </li>
        )}
        <li>
          🔥 Серия: <b>{props.streak}</b> {plural(props.streak, ["день", "дня", "дней"])}.{" "}
          {props.todayDone ? "Минимум на сегодня выполнен ✓" : `Сегодня нужно ${props.minCalls} наборов, чтобы её продлить.`}
        </li>
      </ul>
      <button onClick={dismiss} className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-bg">Погнали 📞</button>
    </section>
  );
}
