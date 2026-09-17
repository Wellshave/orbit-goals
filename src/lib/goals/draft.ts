import { addDays, format as fmt, parseISO } from "date-fns";
import type { Frequency, Goal, GoalDetails, GoalFormat, GoalRoutine, GoalTrack, GoalType, RoutinePeriod, Visibility } from "@/lib/types";
import { dfLocale, type Locale, type T } from "@/lib/i18n";
import { TIME_UNIT, fmtDuration, fmtValue, splitSeconds, toSeconds } from "@/lib/format";
import type { Suggestion } from "./suggest";
import { effectiveFormat } from "./formats";

export interface HMS { h: string; m: string; s: string }
export interface DraftMilestone { name: string; value: string; date: string; reward: string }
export interface DraftRoutine { enabled: boolean; name: string; times: string; period: RoutinePeriod; track: "sessions" | "quantity" | "both"; unit: string }

/** Alles wat de wizard verzamelt. Blijft in één object zodat teruggaan naar een vorige stap niets kwijtraakt. */
export interface Draft {
  title: string; format: GoalFormat | null; icon: string;
  startDate: string; deadline: string;
  hasQuantity: boolean; quantity: string; unit: string; quantityLabel: string;
  ambition: "finish" | "time" | "pr"; time: HMS; criteria: string; prepLongest: string;
  startValue: string; targetValue: string; frequency: Frequency;
  habitTimes: string; habitPeriod: RoutinePeriod; habitWeeks: string; habitRule: string;
  valueKind: "number" | "time"; curTime: HMS; tgtTime: HMS; direction: "higher" | "lower";
  deliverable: string; doneDefinition: string;
  milestones: DraftMilestone[]; routine: DraftRoutine;
  scope: GoalType; visibility: Visibility; shares: string[]; teamId: string; ownerId: string; assignees: string[]; parentId: string;
  category: string; description: string; featured: boolean;
}

export const STEP_COUNT = 5;
const today = () => new Date().toISOString().slice(0, 10);
const emptyHMS = (): HMS => ({ h: "", m: "", s: "" });

export function emptyDraft(ownerId: string): Draft {
  return {
    title: "", format: null, icon: "", startDate: today(), deadline: "",
    hasQuantity: false, quantity: "", unit: "", quantityLabel: "", ambition: "finish", time: emptyHMS(), criteria: "", prepLongest: "",
    startValue: "0", targetValue: "", frequency: "weekly",
    habitTimes: "3", habitPeriod: "week", habitWeeks: "12", habitRule: "",
    valueKind: "number", curTime: emptyHMS(), tgtTime: emptyHMS(), direction: "higher",
    deliverable: "", doneDefinition: "",
    milestones: [], routine: { enabled: false, name: "", times: "3", period: "week", track: "sessions", unit: "" },
    scope: "personal", visibility: "private", shares: [], teamId: "", ownerId, assignees: [], parentId: "",
    category: "", description: "", featured: false,
  };
}

export function parseNumber(raw: string): number {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const numStr = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(n) ? "" : String(n).replace(".", ","));

/** "1:59:00" of "45:30" → seconden. */
export function parseDuration(raw: string): number {
  const parts = String(raw ?? "").trim().split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return NaN;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

/** Neemt een voorstel over in het concept. Wordt alleen aangeroepen na een expliciete klik. */
export function applySuggestion(d: Draft, s: Suggestion, categoryLabel: string | null): Draft {
  const next: Draft = { ...d, format: s.format, icon: s.icon ?? d.icon };
  if (categoryLabel && !d.category) next.category = categoryLabel;
  if (s.eventDate && !d.deadline) next.deadline = s.eventDate;
  if (s.format === "achievement") {
    if (s.quantity) { next.hasQuantity = true; next.quantity = numStr(s.quantity); next.unit = s.unit ?? ""; next.quantityLabel = s.quantityLabel ?? ""; }
    if (s.successCriteria && !d.criteria) next.criteria = s.successCriteria;
  }
  if (s.format === "numeric_target") {
    if (s.quantity !== undefined) next.targetValue = numStr(s.quantity);
    if (s.unit !== undefined) next.unit = s.unit;
    if (s.startValue !== undefined) next.startValue = numStr(s.startValue);
  }
  if (s.format === "habit" && s.habit) { next.habitTimes = String(s.habit.times); next.habitPeriod = s.habit.period; }
  if (s.format === "improvement") {
    if (s.valueKind) next.valueKind = s.valueKind;
    if (s.direction) next.direction = s.direction;
    if (s.targetTimeS) next.tgtTime = splitSeconds(s.targetTimeS);
    if (s.quantity !== undefined) next.targetValue = numStr(s.quantity);
    if (s.unit !== undefined && s.valueKind !== "time") next.unit = s.unit;
  }
  if (s.milestones && d.milestones.length === 0) next.milestones = s.milestones.map((m) => ({ name: m.name, value: m.value !== undefined ? numStr(m.value) : "", date: "", reward: "" }));
  if (s.routine && !d.routine.enabled && !d.routine.name) next.routine = { enabled: false, name: s.routine.name, times: String(s.routine.times), period: s.routine.period, track: "sessions", unit: s.routine.unit };
  return next;
}

export function trackFor(d: Draft): GoalTrack {
  if (d.format === "habit") return "count";
  if (d.format === "numeric_target" || d.format === "improvement") return "value";
  if (d.format === "achievement" && d.hasQuantity && parseNumber(d.quantity) > 0) return "value";
  return d.milestones.some((m) => m.name.trim()) ? "steps" : "done";
}

export function habitTarget(d: Draft): number {
  const times = Math.max(1, Math.round(parseNumber(d.habitTimes) || 0));
  const weeks = Math.max(1, Math.round(parseNumber(d.habitWeeks) || 0));
  const periods = d.habitPeriod === "day" ? weeks * 7 : d.habitPeriod === "month" ? Math.max(1, Math.round(weeks / 4.345)) : weeks;
  return times * periods;
}

export function effectiveDeadline(d: Draft): string {
  if (d.format !== "habit") return d.deadline;
  const weeks = Math.max(1, Math.round(parseNumber(d.habitWeeks) || 0));
  try { return fmt(addDays(parseISO(d.startDate || today()), weeks * 7 - 1), "yyyy-MM-dd"); } catch { return d.deadline; }
}

/** Foutsleutel (i18n) voor één stap, of null als de stap klopt. Wordt in de wizard en op de server gebruikt. */
export function validateStep(d: Draft, step: number): string | null {
  if (step === 0) {
    if (d.title.trim().length < 3) return "wizard.err.title";
    if (!d.format) return "wizard.err.format";
  }
  if (step === 1) {
    if (d.format !== "habit" && !d.deadline) return "wizard.err.deadline";
    if (d.format !== "habit" && d.deadline < d.startDate) return "wizard.err.deadlineBeforeStart";
    if (d.format === "achievement") {
      if (d.hasQuantity && !(parseNumber(d.quantity) > 0)) return "wizard.err.quantity";
      if (d.ambition === "time" && toSeconds(d.time.h, d.time.m, d.time.s) <= 0) return "wizard.err.time";
      if (d.hasQuantity && d.prepLongest && parseNumber(d.prepLongest) >= parseNumber(d.quantity)) return "wizard.err.prepTooHigh";
    }
    if (d.format === "numeric_target") {
      const a = parseNumber(d.startValue || "0"); const b = parseNumber(d.targetValue);
      if (Number.isNaN(b)) return "wizard.err.target";
      if (Number.isNaN(a)) return "wizard.err.start";
      if (a === b) return "wizard.err.targetEqualsStart";
    }
    if (d.format === "habit") {
      if (!(parseNumber(d.habitTimes) >= 1)) return "wizard.err.habitTimes";
      if (!(parseNumber(d.habitWeeks) >= 1)) return "wizard.err.habitWeeks";
    }
    if (d.format === "improvement") {
      const a = d.valueKind === "time" ? toSeconds(d.curTime.h, d.curTime.m, d.curTime.s) : parseNumber(d.startValue);
      const b = d.valueKind === "time" ? toSeconds(d.tgtTime.h, d.tgtTime.m, d.tgtTime.s) : parseNumber(d.targetValue);
      if (Number.isNaN(a) || (d.valueKind === "time" && a <= 0)) return "wizard.err.currentLevel";
      if (Number.isNaN(b) || (d.valueKind === "time" && b <= 0)) return "wizard.err.targetLevel";
      if (a === b) return "wizard.err.targetEqualsStart";
      if (d.direction === "lower" && b > a) return "wizard.err.directionLower";
      if (d.direction === "higher" && b < a) return "wizard.err.directionHigher";
    }
  }
  if (step === 2) {
    const track = trackFor(d);
    for (const m of d.milestones) {
      if (!m.name.trim()) return "wizard.err.milestoneName";
      if (track === "value" || track === "count") {
        const v = d.format === "improvement" && d.valueKind === "time" ? parseDuration(m.value) : parseNumber(m.value);
        if (Number.isNaN(v)) return d.format === "improvement" && d.valueKind === "time" ? "wizard.err.milestoneTime" : "wizard.err.milestoneValue";
      }
    }
    if (d.routine.enabled) {
      if (!d.routine.name.trim()) return "wizard.err.routineName";
      if (!(parseNumber(d.routine.times) >= 1)) return "wizard.err.routineTimes";
    }
  }
  if (step === 3) {
    if (d.scope === "team" && !d.teamId) return "wizard.err.team";
    if (d.scope === "personal" && d.visibility === "team" && !d.teamId) return "wizard.err.team";
    if (d.visibility === "shared" && d.shares.length === 0) return "wizard.err.shares";
    if (!d.ownerId) return "wizard.err.owner";
  }
  return null;
}

export function firstInvalidStep(d: Draft): { step: number; key: string } | null {
  for (let s = 0; s < 4; s++) { const key = validateStep(d, s); if (key) return { step: s, key }; }
  return null;
}

export interface MappedGoal {
  goal: {
    title: string; description: string; goal_type: GoalType; format: GoalFormat; details: GoalDetails;
    owner_id: string; team_id: string | null; parent_goal_id: string | null; start_date: string; deadline: string;
    measure: "numeric" | "binary"; unit: string; start_value: number; target_value: number; frequency: Frequency;
    visibility: Visibility; category: string; is_featured: boolean;
  };
  milestones: { name: string; target_value: number; target_date: string | null; reward: string; is_ultimate: boolean; sort_order: number }[];
  routine: { name: string; times_per_period: number; period: RoutinePeriod; track: "sessions" | "quantity" | "both"; unit: string } | null;
}

/** Vertaalt het concept naar het bestaande goalmodel (meetsoort + start/target) zodat status, milestones en punten blijven werken. */
export function mapDraft(d: Draft, opts: { stepsUnit: string; defaultCategory: string; existingSteps?: number }): MappedGoal {
  const format = d.format ?? "numeric_target";
  const track = trackFor(d);
  const details: GoalDetails = { track };
  if (d.icon) details.icon = d.icon;
  let measure: "numeric" | "binary" = "numeric";
  let unit = ""; let start = 0; let target = 1; let frequency: Frequency = "weekly";
  const names = d.milestones.filter((m) => m.name.trim());

  if (format === "achievement") {
    details.event_date = d.deadline; details.ambition = d.ambition;
    if (d.criteria.trim()) details.success_criteria = d.criteria.trim();
    if (d.ambition === "time") details.target_time_s = toSeconds(d.time.h, d.time.m, d.time.s);
    if (track === "value") {
      unit = d.unit.trim(); target = parseNumber(d.quantity);
      const longest = parseNumber(d.prepLongest);
      if (longest > 0 && longest < target) { start = 0; details.prep_longest = longest; }
      if (d.quantityLabel.trim()) details.quantity_label = d.quantityLabel.trim();
    }
  }
  if (format === "numeric_target") { unit = d.unit.trim(); start = parseNumber(d.startValue || "0"); target = parseNumber(d.targetValue); frequency = d.frequency; }
  if (format === "habit") {
    const times = Math.max(1, Math.round(parseNumber(d.habitTimes)));
    const weeks = Math.max(1, Math.round(parseNumber(d.habitWeeks)));
    unit = "x"; start = 0; target = habitTarget(d);
    frequency = d.habitPeriod === "day" ? "daily" : d.habitPeriod === "month" ? "monthly" : "weekly";
    details.habit = { times, period: d.habitPeriod, weeks, ...(d.habitRule.trim() ? { rule: d.habitRule.trim() } : {}) };
  }
  if (format === "improvement") {
    details.direction = d.direction; details.value_kind = d.valueKind;
    if (d.valueKind === "time") { unit = TIME_UNIT; start = toSeconds(d.curTime.h, d.curTime.m, d.curTime.s); target = toSeconds(d.tgtTime.h, d.tgtTime.m, d.tgtTime.s); }
    else { unit = d.unit.trim(); start = parseNumber(d.startValue); target = parseNumber(d.targetValue); }
  }
  if (format === "project") {
    if (d.deliverable.trim()) details.deliverable = d.deliverable.trim();
    if (d.doneDefinition.trim()) details.done_definition = d.doneDefinition.trim();
  }
  if (track === "steps") { unit = opts.stepsUnit; start = 0; target = Math.max(1, opts.existingSteps ?? names.length); }
  if (track === "done") { measure = "binary"; unit = ""; start = 0; target = 1; }

  const isTime = format === "improvement" && d.valueKind === "time";
  const milestones = names.map((m, i) => {
    const value = track === "steps" ? i + 1 : track === "done" ? 1 : isTime ? parseDuration(m.value) : parseNumber(m.value);
    return { name: m.name.trim(), target_value: value, target_date: m.date || null, reward: m.reward.trim(), is_ultimate: track === "steps" ? i === names.length - 1 : value === target, sort_order: i + 1 };
  });

  const visibility: Visibility = d.scope === "company" ? "company" : d.scope === "team" ? (d.visibility === "company" ? "company" : "team") : d.visibility;
  const needsTeam = d.scope === "team" || (d.scope === "personal" && visibility === "team");
  const routine = d.routine.enabled && d.routine.name.trim()
    ? { name: d.routine.name.trim(), times_per_period: Math.min(50, Math.max(1, Math.round(parseNumber(d.routine.times)))), period: d.routine.period, track: d.routine.track, unit: d.routine.track === "sessions" ? "" : d.routine.unit.trim() }
    : null;

  return {
    goal: {
      title: d.title.trim(), description: d.description.trim(), goal_type: d.scope, format, details,
      owner_id: d.ownerId, team_id: needsTeam ? d.teamId || null : null, parent_goal_id: d.scope === "personal" ? null : d.parentId || null,
      start_date: d.startDate || today(), deadline: effectiveDeadline(d), measure, unit, start_value: start, target_value: target, frequency,
      visibility, category: d.category.trim() || opts.defaultCategory, is_featured: d.scope !== "personal" && d.featured,
    },
    milestones, routine,
  };
}

/** Bestaand doel terug naar een concept, voor de bewerkflow. */
export function draftFromGoal(g: Goal, extra: { routine: GoalRoutine | null; shares: string[]; assignees: string[]; milestones?: { name: string; target_value: number; target_date: string | null }[] }): Draft {
  const d = emptyDraft(g.owner_id);
  const det = g.details ?? {};
  const isTime = g.unit === TIME_UNIT;
  const format = effectiveFormat(g);
  return {
    ...d,
    title: g.title, format, icon: det.icon ?? "", startDate: g.start_date, deadline: g.deadline,
    hasQuantity: format === "achievement" && g.measure === "numeric" && det.track !== "steps",
    quantity: format === "achievement" && g.measure === "numeric" ? numStr(g.target_value) : "", unit: isTime ? "" : g.unit, quantityLabel: det.quantity_label ?? "",
    ambition: det.ambition ?? "finish", time: splitSeconds(det.target_time_s), criteria: det.success_criteria ?? "", prepLongest: numStr(det.prep_longest),
    startValue: isTime ? "" : numStr(g.start_value), targetValue: isTime ? "" : numStr(g.target_value), frequency: g.frequency,
    habitTimes: String(det.habit?.times ?? 3), habitPeriod: det.habit?.period ?? "week", habitWeeks: String(det.habit?.weeks ?? 12), habitRule: det.habit?.rule ?? "",
    valueKind: isTime ? "time" : "number", curTime: isTime ? splitSeconds(g.start_value) : emptyHMS(), tgtTime: isTime ? splitSeconds(g.target_value) : emptyHMS(),
    direction: det.direction ?? (g.target_value < g.start_value ? "lower" : "higher"),
    deliverable: det.deliverable ?? "", doneDefinition: det.done_definition ?? "",
    // Alleen ter info en om de voortgangsmethode te bepalen; milestones beheer je op de doelpagina.
    milestones: (extra.milestones ?? []).map((m) => ({ name: m.name, value: isTime ? fmtDuration(m.target_value) : numStr(m.target_value), date: m.target_date ?? "", reward: "" })),
    routine: extra.routine ? { enabled: true, name: extra.routine.name, times: String(extra.routine.times_per_period), period: extra.routine.period, track: extra.routine.track, unit: extra.routine.unit } : d.routine,
    scope: g.goal_type, visibility: g.visibility, shares: extra.shares, teamId: g.team_id ?? "", ownerId: g.owner_id, assignees: extra.assignees, parentId: g.parent_goal_id ?? "",
    category: g.category, description: g.description, featured: g.is_featured,
  };
}

/** Begrijpelijke samenvatting voor het live paneel en de controle vóór opslaan. */
export function summarize(t: T, locale: Locale, d: Draft, ctx: { teamName?: string; shareNames?: string[]; editing?: boolean }): string[] {
  const out: string[] = [];
  const title = d.title.trim() || t("wizard.summary.untitled");
  const dl = effectiveDeadline(d);
  const date = dl ? fmt(parseISO(dl), "d MMMM yyyy", { locale: dfLocale(locale) }) : "";
  if (!d.format) { out.push(t("wizard.summary.start", { title })); return out; }
  if (d.format === "achievement") {
    const q = d.hasQuantity && parseNumber(d.quantity) > 0 ? fmtValue(parseNumber(d.quantity), d.unit) : "";
    out.push(date ? t("wizard.summary.achievementDate", { date, title }) : t("wizard.summary.achievement", { title }));
    if (q) out.push(t("wizard.summary.quantity", { q }));
    if (d.ambition === "time" && toSeconds(d.time.h, d.time.m, d.time.s) > 0) out.push(t("wizard.summary.withinTime", { time: fmtDuration(toSeconds(d.time.h, d.time.m, d.time.s)) }));
    if (d.ambition === "pr") out.push(t("wizard.summary.pr"));
  }
  if (d.format === "numeric_target") {
    const b = parseNumber(d.targetValue);
    out.push(Number.isNaN(b) ? t("wizard.summary.numericOpen", { title }) : t("wizard.summary.numeric", { title, target: fmtValue(b, d.unit), date: date || "…" }));
  }
  if (d.format === "habit") out.push(t("wizard.summary.habit", { title, times: d.habitTimes || "…", period: t(`wizard.per.${d.habitPeriod}`), weeks: d.habitWeeks || "…", total: habitTarget(d) }));
  if (d.format === "improvement") {
    const a = d.valueKind === "time" ? toSeconds(d.curTime.h, d.curTime.m, d.curTime.s) : parseNumber(d.startValue);
    const b = d.valueKind === "time" ? toSeconds(d.tgtTime.h, d.tgtTime.m, d.tgtTime.s) : parseNumber(d.targetValue);
    const u = d.valueKind === "time" ? TIME_UNIT : d.unit;
    out.push(Number.isNaN(a) || Number.isNaN(b) || (d.valueKind === "time" && (!a || !b)) ? t("wizard.summary.improvementOpen", { title }) : t("wizard.summary.improvement", { title, from: fmtValue(a, u), to: fmtValue(b, u), date: date || "…" }));
  }
  if (d.format === "project") out.push(date ? t("wizard.summary.projectDate", { title, date }) : t("wizard.summary.project", { title }));

  const n = d.milestones.filter((m) => m.name.trim()).length;
  if (!ctx.editing && n > 0) out.push(d.format === "project" ? t("wizard.summary.steps", { n }) : n === 1 ? t("wizard.summary.milestoneOne") : t("wizard.summary.milestones", { n }));
  if (d.routine.enabled && d.routine.name.trim()) out.push(t("wizard.summary.routine", { name: d.routine.name.trim(), times: d.routine.times, period: t(`wizard.per.${d.routine.period}`) }));

  if (d.scope === "company") out.push(t("wizard.summary.visCompany"));
  else if (d.scope === "team") out.push(t("wizard.summary.visTeamGoal", { team: ctx.teamName ?? "…" }));
  else if (d.visibility === "private") out.push(t("wizard.summary.visPrivate"));
  else if (d.visibility === "shared") out.push(t("wizard.summary.visShared", { names: (ctx.shareNames ?? []).join(", ") || "…" }));
  else if (d.visibility === "team") out.push(t("wizard.summary.visTeam", { team: ctx.teamName ?? "…" }));
  else out.push(t("wizard.summary.visCompany"));
  return out;
}
