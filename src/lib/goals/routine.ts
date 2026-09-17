import { addDays, addMonths, differenceInCalendarDays, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { GoalRoutine, RoutineLog } from "@/lib/types";

function periodStart(period: GoalRoutine["period"], at: Date): Date {
  return period === "day" ? startOfDay(at) : period === "month" ? startOfMonth(at) : startOfWeek(at, { weekStartsOn: 1 });
}
function nextPeriod(period: GoalRoutine["period"], start: Date): Date {
  return period === "day" ? addDays(start, 1) : period === "month" ? addMonths(start, 1) : addDays(start, 7);
}

export interface RoutineStats { done: number; target: number; quantity: number; longest: number; consistency: number | null; periodsCounted: number; total: number; }

/** Voortgangssignalen van een gekoppelde routine: deze periode, hoeveelheid, langste sessie en consistentie. */
export function routineStats(routine: GoalRoutine, logs: RoutineLog[], now: Date = new Date()): RoutineStats {
  const mine = logs.filter((l) => l.routine_id === routine.id);
  const start = periodStart(routine.period, now);
  const inPeriod = mine.filter((l) => parseISO(l.logged_on) >= start);
  const quantity = inPeriod.reduce((s, l) => s + (l.quantity ?? 0), 0);
  const longest = mine.reduce((m, l) => Math.max(m, l.quantity ?? 0), 0);

  // Consistentie: aandeel afgeronde periodes (max. 8, zonder de lopende) waarin het aantal gehaald is.
  let hits = 0; let counted = 0;
  const created = periodStart(routine.period, parseISO(routine.created_at));
  let cursor = created;
  const periods: Date[] = [];
  while (cursor < start && periods.length < 400) { periods.push(cursor); cursor = nextPeriod(routine.period, cursor); }
  for (const p of periods.slice(-8)) {
    const end = nextPeriod(routine.period, p);
    const n = mine.filter((l) => { const d = parseISO(l.logged_on); return d >= p && d < end; }).length;
    counted += 1;
    if (n >= routine.times_per_period) hits += 1;
  }
  return { done: inPeriod.length, target: routine.times_per_period, quantity, longest, consistency: counted > 0 ? hits / counted : null, periodsCounted: counted, total: mine.length };
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return differenceInCalendarDays(now, parseISO(iso));
}
