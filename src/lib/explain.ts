import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Goal, Milestone } from "./types";
import type { KpiView } from "./data/kpis";
import { daysLeft, goalExpected, goalForecastDate, goalProgress, milestonePosition } from "./status";
import { fmtValue, fmtNum } from "./format";

/** Cijfers uitgelegd in gewone taal. */
export function explainGoal(g: Goal): string {
  if (g.status === "achieved") return g.achieved_at ? `Behaald op ${format(new Date(g.achieved_at), "d MMMM", { locale: nl })}. Goed gedaan!` : "Behaald. Goed gedaan!";
  if (g.measure === "binary") {
    const d = daysLeft(g.deadline);
    return d < 0 ? `De deadline is ${Math.abs(d)} dagen geleden verstreken.` : d === 0 ? "Vandaag is de deadline." : `Nog ${d} dagen tot de deadline.`;
  }
  const p = goalProgress(g);
  const e = goalExpected(g);
  const diff = Math.round((p - e) * 100);
  if (p <= 0) return "Nog geen voortgang toegevoegd.";
  if (diff >= 3) return `Je ligt ${diff}% voor op schema.`;
  if (diff <= -3) return `Je ligt ${Math.abs(diff)}% achter op schema.`;
  return "Je ligt precies op schema.";
}

export function explainForecast(g: Goal): string | null {
  if (g.status === "achieved" || g.measure === "binary") return null;
  const d = goalForecastDate(g);
  if (!d) return null;
  const deadline = new Date(g.deadline);
  const when = format(d, "d MMMM", { locale: nl });
  if (d <= deadline) return `Met dit tempo bereik je het doel rond ${when}.`;
  return `Met dit tempo kom je rond ${when} uit, na de deadline.`;
}

export function nextMilestone(g: Goal, milestones: Milestone[]): Milestone | null {
  const pending = milestones.filter((m) => m.status === "pending").sort((a, b) => milestonePosition(g, a.target_value) - milestonePosition(g, b.target_value));
  return pending[0] ?? null;
}

export function explainMilestone(g: Goal, m: Milestone | null): string | null {
  if (!m) return null;
  if (g.measure === "binary") return `Volgende milestone: ${m.name}`;
  const remaining = g.target_value >= g.start_value ? m.target_value - g.current_value : g.current_value - m.target_value;
  if (remaining <= 0) return `Milestone ${m.name} is binnen bereik.`;
  return `Nog ${fmtValue(remaining, g.unit)} tot milestone ${m.name}`;
}

export function progressLabel(g: Goal): string {
  if (g.measure === "binary") return g.current_value >= 1 ? "Afgerond" : "Nog open";
  return `${fmtValue(g.current_value, g.unit)} van ${fmtValue(g.target_value, g.unit)}`;
}

export function explainKpi(v: KpiView): string {
  const { kpi } = v;
  if (v.value === null) return "Nog geen check-in ingevuld.";
  const higher = kpi.direction === "higher_better";
  const diff = v.diff ?? 0;
  const hit = higher ? diff >= 0 : diff <= 0;
  if (hit) return diff === 0 ? "Precies op target." : `Target gehaald, ${fmtValue(Math.abs(diff), kpi.unit)} ${higher ? "erboven" : "eronder"}.`;
  return `Nog ${fmtValue(Math.abs(diff), kpi.unit)} tot het target.`;
}

export function explainKpiChange(v: KpiView, periodWord = "periode"): string | null {
  if (v.change === null) return null;
  if (v.change === 0) return `Gelijk aan vorige ${periodWord}.`;
  const higher = v.kpi.direction === "higher_better";
  const good = (v.change > 0) === higher;
  const amount = v.kpi.unit === "%" ? `${fmtNum(Math.abs(v.change), 1)} punt` : fmtValue(Math.abs(v.change), v.kpi.unit);
  return `${amount} ${v.change > 0 ? "meer" : "minder"} dan vorige ${periodWord}${good ? "" : ""}.`;
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 6 ? "Goedenacht" : h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
  return `${g} ${name.split(" ")[0]}`;
}
