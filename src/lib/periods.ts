import {
  addDays, addMonths, addQuarters, addWeeks, addYears, endOfDay, format, isValid, parseISO,
  startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear,
} from "date-fns";
import { nl } from "date-fns/locale";
import type { Frequency } from "./types";

export type PeriodKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

export interface Period {
  key: PeriodKey;
  from: Date;      // inclusief
  to: Date;        // exclusief
  label: string;
  short: string;
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Vandaag",
  week: "Deze week",
  month: "Deze maand",
  quarter: "Dit kwartaal",
  year: "Dit jaar",
  custom: "Eigen periode",
};

export function resolvePeriod(sp: Record<string, string | string[] | undefined>, fallback: PeriodKey = "week"): Period {
  const raw = (Array.isArray(sp.period) ? sp.period[0] : sp.period) as PeriodKey | undefined;
  const key: PeriodKey = raw && raw in PERIOD_LABELS ? raw : fallback;
  const now = new Date();
  const opts = { weekStartsOn: 1 as const };

  if (key === "custom") {
    const f = parseISO(String(sp.from ?? ""));
    const t = parseISO(String(sp.to ?? ""));
    if (isValid(f) && isValid(t) && t >= f) {
      return {
        key, from: startOfDay(f), to: addDays(startOfDay(t), 1),
        label: `${format(f, "d MMM", { locale: nl })} – ${format(t, "d MMM yyyy", { locale: nl })}`,
        short: "Eigen",
      };
    }
  }
  switch (key) {
    case "today": {
      const from = startOfDay(now);
      return { key, from, to: addDays(from, 1), label: format(now, "EEEE d MMMM", { locale: nl }), short: "Vandaag" };
    }
    case "month": {
      const from = startOfMonth(now);
      return { key, from, to: addMonths(from, 1), label: format(now, "MMMM yyyy", { locale: nl }), short: "Maand" };
    }
    case "quarter": {
      const from = startOfQuarter(now);
      return { key, from, to: addQuarters(from, 1), label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`, short: "Kwartaal" };
    }
    case "year": {
      const from = startOfYear(now);
      return { key, from, to: addYears(from, 1), label: String(now.getFullYear()), short: "Jaar" };
    }
    default: {
      const from = startOfWeek(now, opts);
      return {
        key: "week", from, to: addWeeks(from, 1),
        label: `Week ${format(now, "I", { locale: nl })} · ${format(from, "d MMM", { locale: nl })} – ${format(addDays(from, 6), "d MMM", { locale: nl })}`,
        short: "Week",
      };
    }
  }
}

/** Vorige periode van dezelfde lengte (voor vergelijking). */
export function previousPeriod(p: Period): { from: Date; to: Date } {
  const len = p.to.getTime() - p.from.getTime();
  return { from: new Date(p.from.getTime() - len), to: p.from };
}

/** Meetperiode die bij een frequentie hoort, voor een gegeven datum. */
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

export function periodLabel(freq: Frequency, start: Date): string {
  switch (freq) {
    case "daily": return format(start, "EEE d MMM", { locale: nl });
    case "weekly": return `Wk ${format(start, "I", { locale: nl })}`;
    case "monthly": return format(start, "MMM yyyy", { locale: nl });
    case "quarterly": return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    case "yearly": return format(start, "yyyy");
  }
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Dagelijks", weekly: "Wekelijks", monthly: "Maandelijks", quarterly: "Per kwartaal", yearly: "Jaarlijks",
};

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function endOfPeriodDay(d: Date): Date {
  return endOfDay(d);
}
