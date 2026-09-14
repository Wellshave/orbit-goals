import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Goal, Kpi, Status } from "./types";
import { clamp } from "./format";

export const STATUS_META: Record<Status, { label: string; tone: string; glyph: string; short: string }> = {
  not_started: { label: "Niet gestart", tone: "muted", glyph: "○", short: "Niet gestart" },
  on_track: { label: "Op schema", tone: "cobalt", glyph: "▲", short: "Op schema" },
  needs_attention: { label: "Aandacht nodig", tone: "amber", glyph: "◆", short: "Aandacht" },
  behind: { label: "Achter op schema", tone: "coral", glyph: "▼", short: "Achter" },
  achieved: { label: "Behaald", tone: "orchid", glyph: "★", short: "Behaald" },
};

export const STATUS_ORDER: Status[] = ["behind", "needs_attention", "on_track", "not_started", "achieved"];

/** Voortgang 0..1+ (zelfde formule als goal_progress() in de database). */
export function goalProgress(g: Pick<Goal, "measure" | "start_value" | "target_value" | "current_value">): number {
  if (g.measure === "binary") return clamp(g.current_value, 0, 1);
  if (g.target_value === g.start_value) return 0;
  return Math.max(0, (g.current_value - g.start_value) / (g.target_value - g.start_value));
}

/** Verwachte voortgang op basis van verstreken tijd. */
export function goalExpected(g: Pick<Goal, "start_date" | "deadline">, at: Date = new Date()): number {
  const s = parseISO(g.start_date);
  const d = parseISO(g.deadline);
  const total = differenceInCalendarDays(d, s);
  if (total <= 0) return 1;
  const done = differenceInCalendarDays(at, s);
  return clamp(done / total, 0, 1);
}

/** Verwachte eindwaarde als het huidige tempo doorzet. */
export function goalForecast(g: Goal, at: Date = new Date()): number | null {
  if (g.measure === "binary") return null;
  const e = goalExpected(g, at);
  if (e <= 0.02) return null;
  const rate = (g.current_value - g.start_value) / e;
  return g.start_value + rate;
}

export function daysLeft(deadline: string, at: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(deadline), at);
}

/** Positie van een milestone op de as van het doel (0..1). */
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

export const GOAL_TYPE_LABELS = { personal: "Persoonlijk", team: "Team", company: "Company" } as const;
export const VISIBILITY_LABELS = {
  private: "Privé — alleen jij",
  shared: "Gedeeld — geselecteerde personen",
  team: "Team — zichtbaar voor het team",
  company: "Company — iedereen in de organisatie",
} as const;
export const VISIBILITY_SHORT = { private: "Privé", shared: "Gedeeld", team: "Team", company: "Company" } as const;
export const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Teamlid" } as const;
export const SCOPE_LABELS = { personal: "Persoonlijk", team: "Team", company: "Company" } as const;
export const REWARD_KIND_LABELS = {
  team_outing: "Teamuitje", bonus: "Bonus", day_off: "Vrije dag", dinner: "Diner", personal: "Persoonlijke beloning", other: "Anders",
} as const;
