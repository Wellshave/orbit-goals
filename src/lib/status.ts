import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Goal, Kpi, Status } from "./types";
import { clamp } from "./format";
import type { T } from "./i18n";

export type Tone = "blue" | "purple" | "mint" | "yellow" | "coral" | "grey";

export const STATUS_META: Record<Status, { tone: Tone }> = {
  not_started: { tone: "grey" }, on_track: { tone: "blue" }, needs_attention: { tone: "yellow" }, behind: { tone: "coral" }, achieved: { tone: "mint" },
};

export function statusLabel(t: T, status: Status): string {
  return t(`status.${status}`);
}

export const STATUS_ORDER: Status[] = ["behind", "needs_attention", "on_track", "not_started", "achieved"];

/** Weergavestatus: 'Bijna gehaald' als het doel ≥ 90% is maar nog niet behaald. */
export function displayStatus(t: T, status: Status, progress: number): { label: string; tone: Tone } {
  if (status !== "achieved" && progress >= 0.9) return { label: t("status.almost"), tone: "purple" };
  return { label: t(`status.${status}`), tone: STATUS_META[status].tone };
}

export function goalProgress(g: Pick<Goal, "measure" | "start_value" | "target_value" | "current_value">): number {
  if (g.measure === "binary") return clamp(g.current_value, 0, 1);
  if (g.target_value === g.start_value) return 0;
  return Math.max(0, (g.current_value - g.start_value) / (g.target_value - g.start_value));
}

export function goalExpected(g: Pick<Goal, "start_date" | "deadline">, at: Date = new Date()): number {
  const s = parseISO(g.start_date);
  const d = parseISO(g.deadline);
  const total = differenceInCalendarDays(d, s);
  if (total <= 0) return 1;
  const done = differenceInCalendarDays(at, s);
  return clamp(done / total, 0, 1);
}

export function goalForecast(g: Goal, at: Date = new Date()): number | null {
  if (g.measure === "binary") return null;
  const e = goalExpected(g, at);
  if (e <= 0.02) return null;
  const rate = (g.current_value - g.start_value) / e;
  return g.start_value + rate;
}

/** Verwachte datum waarop het doel gehaald wordt bij het huidige tempo. */
export function goalForecastDate(g: Goal, at: Date = new Date()): Date | null {
  if (g.measure === "binary") return null;
  const p = goalProgress(g);
  const s = parseISO(g.start_date);
  const elapsed = differenceInCalendarDays(at, s);
  if (p <= 0.02 || elapsed <= 0) return null;
  const totalDays = elapsed / p;
  const d = new Date(s);
  d.setDate(d.getDate() + Math.round(totalDays));
  return d;
}

export function daysLeft(deadline: string, at: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(deadline), at);
}

export function milestonePosition(g: Pick<Goal, "start_value" | "target_value" | "measure">, target: number): number {
  if (g.measure === "binary") return 1;
  if (g.target_value === g.start_value) return 1;
  return clamp((target - g.start_value) / (g.target_value - g.start_value), 0, 1);
}

export function kpiRatio(k: Pick<Kpi, "direction" | "target_value">, value: number | null): number | null {
  if (value === null || value === undefined) return null;
  if (k.direction === "higher_better") return k.target_value === 0 ? 1 : value / k.target_value;
  return value === 0 ? 1 : k.target_value / value;
}

export function kpiStatus(k: Pick<Kpi, "direction" | "target_value">, value: number | null): Status {
  const r = kpiRatio(k, value);
  if (r === null) return "not_started";
  if (r >= 1) return "achieved";
  if (r >= 0.9) return "on_track";
  if (r >= 0.7) return "needs_attention";
  return "behind";
}

export function kpiHit(k: Pick<Kpi, "direction" | "target_value">, value: number): boolean {
  return k.direction === "higher_better" ? value >= k.target_value : value <= k.target_value;
}


/** Accentkleur per goaltype (teamdoelen gebruiken de teamkleur). */
export const GOAL_TYPE_TONE: Record<Goal["goal_type"], Tone> = { personal: "mint", team: "purple", company: "yellow" };
