import {
  addDays, addMonths, addQuarters, addWeeks, addYears, endOfDay, format, isValid, parseISO,
  startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear,
} from "date-fns";
import type { Frequency } from "./types";
import { dfLocale, makeT, type Locale, type T } from "./i18n";

export type PeriodKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

export interface Period { key: PeriodKey; from: Date; to: Date; label: string; short: string; }

export const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "quarter", "year", "custom"];

export function resolvePeriod(sp: Record<string, string | string[] | undefined>, fallback: PeriodKey = "week", locale: Locale = "nl"): Period {
  const t = makeT(locale);
  const dl = { locale: dfLocale(locale) };
  const raw = (Array.isArray(sp.period) ? sp.period[0] : sp.period) as PeriodKey | undefined;
  const key: PeriodKey = raw && PERIOD_KEYS.includes(raw) ? raw : fallback;
  const now = new Date();
  const opts = { weekStartsOn: 1 as const };

  if (key === "custom") {
    const f = parseISO(String(sp.from ?? ""));
    const to = parseISO(String(sp.to ?? ""));
    if (isValid(f) && isValid(to) && to >= f) {
      return { key, from: startOfDay(f), to: addDays(startOfDay(to), 1), label: `${format(f, "d MMM", dl)} – ${format(to, "d MMM yyyy", dl)}`, short: t("period.customShort") };
    }
  }
  switch (key) {
    case "today": { const from = startOfDay(now); return { key, from, to: addDays(from, 1), label: format(now, "EEEE d MMMM", dl), short: t("period.todayShort") }; }
    case "month": { const from = startOfMonth(now); return { key, from, to: addMonths(from, 1), label: format(now, "MMMM yyyy", dl), short: t("period.monthShort") }; }
    case "quarter": { const from = startOfQuarter(now); return { key, from, to: addQuarters(from, 1), label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`, short: t("period.quarterShort") }; }
    case "year": { const from = startOfYear(now); return { key, from, to: addYears(from, 1), label: String(now.getFullYear()), short: t("period.yearShort") }; }
    default: {
      const from = startOfWeek(now, opts);
      return { key: "week", from, to: addWeeks(from, 1), label: t("period.weekLabel", { w: format(now, "I", dl), a: format(from, "d MMM", dl), b: format(addDays(from, 6), "d MMM", dl) }), short: t("period.weekShort") };
    }
  }
}

export function previousPeriod(p: Period): { from: Date; to: Date } {
  const len = p.to.getTime() - p.from.getTime();
  return { from: new Date(p.from.getTime() - len), to: p.from };
}

export function periodForFrequency(freq: Frequency, date: Date = new Date()): { start: Date; end: Date } {
  const opts = { weekStartsOn: 1 as const };
  switch (freq) {
    case "daily": return { start: startOfDay(date), end: startOfDay(date) };
    case "weekly": { const s = startOfWeek(date, opts); return { start: s, end: addDays(s, 6) }; }
    case "monthly": { const s = startOfMonth(date); return { start: s, end: addDays(addMonths(s, 1), -1) }; }
    case "quarterly": { const s = startOfQuarter(date); return { start: s, end: addDays(addQuarters(s, 1), -1) }; }
    case "yearly": { const s = startOfYear(date); return { start: s, end: addDays(addYears(s, 1), -1) }; }
  }
}

export function shiftPeriod(freq: Frequency, start: Date, n: number): Date {
  switch (freq) {
    case "daily": return addDays(start, n);
    case "weekly": return addWeeks(start, n);
    case "monthly": return addMonths(start, n);
    case "quarterly": return addQuarters(start, n);
    case "yearly": return addYears(start, n);
  }
}

export function periodLabel(freq: Frequency, start: Date, locale: Locale = "nl"): string {
  const dl = { locale: dfLocale(locale) };
  switch (freq) {
    case "daily": return format(start, "EEE d MMM", dl);
    case "weekly": return `${makeT(locale)("period.wk")} ${format(start, "I", dl)}`;
    case "monthly": return format(start, "MMM yyyy", dl);
    case "quarterly": return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    case "yearly": return format(start, "yyyy");
  }
}

export function frequencyLabel(t: T, freq: Frequency): string {
  return t(`freq.${freq}`);
}
export function periodWord(t: T, freq: Frequency): string {
  return t(`periodWord.${freq}`);
}
export const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
export function endOfPeriodDay(d: Date): Date {
  return endOfDay(d);
}
