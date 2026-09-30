import type { Database } from "@/lib/database.types";

export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type OfferType = Database["public"]["Enums"]["offer_type"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];

export const ACTIONS: {
  type: ActivityType;
  label: string;
  short: string;
  icon: string;
  /** нужен ли выбор отрасли/оффера */
  details: boolean;
  needsLead: boolean;
}[] = [
  { type: "call", label: "Не ответил", short: "Звонок", icon: "📵", details: false, needsLead: false },
  { type: "conversation", label: "Разговор", short: "Разговор", icon: "🗣️", details: true, needsLead: true },
  { type: "rejection", label: "Отказ", short: "Отказ", icon: "✋", details: true, needsLead: true },
  { type: "followup", label: "Фоллоу-ап", short: "Фоллоу-ап", icon: "🔁", details: false, needsLead: true },
  { type: "meeting_set", label: "Встреча!", short: "Встреча", icon: "📅", details: true, needsLead: true },
  { type: "meeting_held", label: "Провёл встречу", short: "Проведена", icon: "🤝", details: true, needsLead: true },
  { type: "proposal", label: "Отправил КП", short: "КП", icon: "📄", details: true, needsLead: true },
  { type: "deal", label: "Сделка", short: "Сделка", icon: "🏆", details: true, needsLead: true },
];

export const ACTION_BY_TYPE = Object.fromEntries(ACTIONS.map((a) => [a.type, a])) as Record<
  ActivityType,
  (typeof ACTIONS)[number]
>;

export const FEED_VERB: Record<ActivityType, string> = {
  call: "звонок без ответа",
  conversation: "разговор",
  rejection: "получил отказ",
  followup: "фоллоу-ап",
  meeting_set: "назначил встречу",
  meeting_held: "провёл встречу",
  proposal: "отправил КП",
  deal: "закрыл сделку",
};

export const NOTE_ICON: Record<string, string> = {
  meeting: "📅",
  deal: "🏆",
  proposal: "📄",
  achievement: "🎖️",
  overtake: "⚡",
  blitz: "🔥",
};

export const OFFERS: { value: OfferType; label: string }[] = [
  { value: "website", label: "Сайт" },
  { value: "automation", label: "Автоматизация" },
  { value: "ai", label: "ИИ" },
  { value: "mixed", label: "Комплекс" },
];
export const OFFER_LABEL = Object.fromEntries(OFFERS.map((o) => [o.value, o.label])) as Record<OfferType, string>;

export const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Новый" },
  { value: "contacted", label: "Был контакт" },
  { value: "meeting_set", label: "Встреча назначена" },
  { value: "meeting_held", label: "Встреча проведена" },
  { value: "proposal", label: "КП" },
  { value: "won", label: "Сделка" },
  { value: "lost", label: "Отказ" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<LeadStatus, string>;

export const DEFAULT_INDUSTRIES = [
  "Ритейл",
  "HoReCa",
  "Клиники",
  "Недвижимость",
  "Логистика",
  "Строительство",
  "Образование",
  "Туризм",
  "Финансы",
  "Производство",
];

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const TIMEZONES = [
  { value: "Asia/Bishkek", label: "Бишкек (UTC+6)" },
  { value: "Africa/Nairobi", label: "Найроби (UTC+3)" },
  { value: "Asia/Almaty", label: "Алматы (UTC+5)" },
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Asia/Dubai", label: "Дубай (UTC+4)" },
  { value: "Europe/Istanbul", label: "Стамбул (UTC+3)" },
  { value: "UTC", label: "UTC" },
];

/** Склонение: plural(5, ["очко", "очка", "очков"]) */
export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function fmtUsd(n: number) {
  return "$" + Math.round(n).toLocaleString("ru-RU");
}

/** Локальное время в поясе игрока */
export function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

export function fmtDay(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(date + "T00:00:00Z"),
  );
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekLabel(weekStart: string) {
  return `${fmtDay(weekStart)} – ${fmtDay(addDays(weekStart, 6))}`;
}

/** Цвет игрока → мягкий фон */
export function tint(hex: string, alpha = 0.14) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Локальные «сегодня» и понедельник недели игрока (как player_local в SQL), без запроса к БД. */
export function playerToday(tz: string, at = new Date()) {
  const local_date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const isoDow = ((new Date(local_date + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  return { local_date, week_start: addDays(local_date, 1 - isoDow) };
}
