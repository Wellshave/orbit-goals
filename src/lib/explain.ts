import { format } from "date-fns";
import type { Goal, Milestone } from "./types";
import type { KpiView } from "./data/kpis";
import { daysLeft, goalExpected, goalForecastDate, goalProgress, milestonePosition } from "./status";
import { fmtValue, fmtNum } from "./format";
import { dfLocale, type Locale, type T } from "./i18n";

/** Cijfers uitgelegd in gewone taal, in de taal van de gebruiker. */
export function explainGoal(t: T, locale: Locale, g: Goal): string {
  const dl = { locale: dfLocale(locale) };
  if (g.status === "achieved") return g.achieved_at ? t("explain.achievedOn", { d: format(new Date(g.achieved_at), "d MMMM", dl) }) : t("explain.achieved");
  if (g.measure === "binary") {
    const d = daysLeft(g.deadline);
    return d < 0 ? t("explain.deadlinePassed", { n: Math.abs(d) }) : d === 0 ? t("explain.deadlineToday") : t("explain.deadlineIn", { n: d });
  }
  const p = goalProgress(g);
  const e = goalExpected(g);
  const diff = Math.round((p - e) * 100);
  if (p <= 0) return t("explain.noProgress");
  if (diff >= 3) return t("explain.ahead", { n: diff });
  if (diff <= -3) return t("explain.behind", { n: Math.abs(diff) });
  return t("explain.onSchedule");
}

export function explainForecast(t: T, locale: Locale, g: Goal): string | null {
  if (g.status === "achieved" || g.measure === "binary") return null;
  const d = goalForecastDate(g);
  if (!d) return null;
  const when = format(d, "d MMMM", { locale: dfLocale(locale) });
  return d <= new Date(g.deadline) ? t("explain.forecast", { d: when }) : t("explain.forecastLate", { d: when });
}

export function nextMilestone(g: Goal, milestones: Milestone[]): Milestone | null {
  const pending = milestones.filter((m) => m.status === "pending").sort((a, b) => milestonePosition(g, a.target_value) - milestonePosition(g, b.target_value));
  return pending[0] ?? null;
}

export function explainMilestone(t: T, g: Goal, m: Milestone | null): string | null {
  if (!m) return null;
  if (g.measure === "binary") return t("explain.nextMilestone", { m: m.name });
  const remaining = g.target_value >= g.start_value ? m.target_value - g.current_value : g.current_value - m.target_value;
  if (remaining <= 0) return t("explain.milestoneInReach", { m: m.name });
  return t("explain.remaining", { v: fmtValue(remaining, g.unit), m: m.name });
}

export function progressLabel(t: T, g: Goal): string {
  if (g.measure === "binary") return g.current_value >= 1 ? t("explain.done") : t("explain.open");
  return t("explain.ofTarget", { a: fmtValue(g.current_value, g.unit), b: fmtValue(g.target_value, g.unit) });
}

export function explainKpi(t: T, v: KpiView): string {
  const { kpi } = v;
  if (v.value === null) return t("explain.kpiNoCheckin");
  const higher = kpi.direction === "higher_better";
  const diff = v.diff ?? 0;
  const hit = higher ? diff >= 0 : diff <= 0;
  if (hit) return diff === 0 ? t("explain.kpiExact") : t("explain.kpiHit", { v: fmtValue(Math.abs(diff), kpi.unit), dir: t(higher ? "explain.above" : "explain.below") });
  return t("explain.kpiRemaining", { v: fmtValue(Math.abs(diff), kpi.unit) });
}

export function explainKpiChange(t: T, v: KpiView, periodWord: string): string | null {
  if (v.change === null) return null;
  if (v.change === 0) return t("explain.changeSame", { p: periodWord });
  const amount = v.kpi.unit === "%" ? `${fmtNum(Math.abs(v.change), 1)} ${t("explain.point")}` : fmtValue(Math.abs(v.change), v.kpi.unit);
  return t("explain.change", { v: amount, dir: t(v.change > 0 ? "explain.moreWord" : "explain.lessWord"), p: periodWord });
}

export function greeting(t: T, name: string): string {
  const h = new Date().getHours();
  const key = h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `${t(`explain.${key}`)} ${name.split(" ")[0]}`;
}
