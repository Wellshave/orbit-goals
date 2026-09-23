import type { SupabaseClient } from "@supabase/supabase-js";
import type { Kpi, KpiAssignment, KpiCheckin } from "@/lib/types";
import { periodForFrequency, shiftPeriod, toISODate } from "@/lib/periods";
import { kpiHit, kpiRatio, kpiStatus } from "@/lib/status";

export async function listKpis(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase.from("kpis").select("*").eq("org_id", orgId).order("category").order("name");
  return (data ?? []) as Kpi[];
}

export async function listKpiAssignments(supabase: SupabaseClient, kpiIds: string[]) {
  if (kpiIds.length === 0) return [] as KpiAssignment[];
  const { data } = await supabase.from("kpi_assignments").select("*").in("kpi_id", kpiIds);
  return (data ?? []) as KpiAssignment[];
}

export async function listCheckins(supabase: SupabaseClient, kpiIds: string[], opts?: { from?: Date; to?: Date; limit?: number }) {
  if (kpiIds.length === 0) return [] as KpiCheckin[];
  let q = supabase.from("kpi_checkins").select("*").in("kpi_id", kpiIds).order("period_start", { ascending: false });
  if (opts?.from) q = q.gte("period_start", toISODate(opts.from));
  if (opts?.to) q = q.lt("period_start", toISODate(opts.to));
  if (opts?.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as KpiCheckin[];
}

export interface KpiView {
  kpi: Kpi;
  assignees: string[];
  /** Check-ins van de KPI, nieuwste eerst */
  checkins: KpiCheckin[];
  /** Huidige (laatst ingevulde) periode-waarde binnen de gekozen periode, of null */
  value: number | null;
  previous: number | null;
  status: ReturnType<typeof kpiStatus>;
  ratio: number | null;
  diff: number | null;
  change: number | null;
  forecast: number | null;
  streak: number;
  lastCheckin: KpiCheckin | null;
  /** De lopende periode; `done` zegt of die al is ingevuld */
  openPeriod: { start: Date; end: Date; done: boolean };
  /** De periode ervoor, om alsnog in te vullen of te corrigeren */
  previousPeriod: { start: Date; end: Date; done: boolean };
  /** Waarde, verhouding en status van de lopende periode */
  currentValue: number | null;
  currentRatio: number | null;
  currentStatus: ReturnType<typeof kpiStatus>;
  seriesValues: number[];
}

/** Bouwt de afgeleide weergave van een KPI voor een rapportageperiode. */
export function buildKpiView(kpi: Kpi, assignments: KpiAssignment[], allCheckins: KpiCheckin[], period: { from: Date; to: Date }, forProfile?: string): KpiView {
  const assignees = assignments.filter((a) => a.kpi_id === kpi.id).map((a) => a.profile_id);
  let checkins = allCheckins.filter((c) => c.kpi_id === kpi.id);
  if (forProfile && kpi.scope === "personal") checkins = checkins.filter((c) => c.profile_id === forProfile);
  checkins = [...checkins].sort((a, b) => b.period_start.localeCompare(a.period_start));

  // Per periode samenvoegen (bij team/company de som over personen)
  const byPeriod = new Map<string, number>();
  for (const c of checkins) {
    byPeriod.set(c.period_start, (byPeriod.get(c.period_start) ?? 0) + Number(c.value));
  }
  const periods = Array.from(byPeriod.keys()).sort();
  const inPeriod = periods.filter((p) => new Date(p) >= period.from && new Date(p) < period.to);
  const latestIn = inPeriod.length ? inPeriod[inPeriod.length - 1] : null;
  const latestAny = periods.length ? periods[periods.length - 1] : null;
  const useKey = latestIn ?? latestAny;
  const value = useKey ? byPeriod.get(useKey)! : null;
  const idx = useKey ? periods.indexOf(useKey) : -1;
  const previous = idx > 0 ? byPeriod.get(periods[idx - 1])! : null;

  const ratio = kpiRatio(kpi, value);
  const status = kpiStatus(kpi, value);
  const diff = value === null ? null : value - kpi.target_value;
  const change = value === null || previous === null ? null : value - previous;

  // Verwachte eindwaarde: lineaire trend over de laatste 4 periodes
  const series = periods.slice(-8).map((p) => byPeriod.get(p)!);
  let forecast: number | null = null;
  if (series.length >= 3) {
    const last = series.slice(-4);
    const slope = (last[last.length - 1] - last[0]) / (last.length - 1);
    forecast = last[last.length - 1] + slope;
  }

  // Streak (opeenvolgende periodes target gehaald, vanaf de laatste)
  let streak = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    if (kpiHit(kpi, byPeriod.get(periods[i])!)) streak++;
    else break;
  }

  // De open check-in is altijd de lopende periode: een wekelijkse KPI hoort bij déze week.
  // Een gemiste vorige periode blijft invulbaar, maar dringt zich nergens meer op.
  const open = periodForFrequency(kpi.frequency, new Date());
  const prevStart = shiftPeriod(kpi.frequency, open.start, -1);
  const prevKey = toISODate(prevStart);
  const curKey = toISODate(open.start);
  const who = forProfile ?? null;
  const has = (k: string) => checkins.some((c) => c.period_start === k && (!who || c.profile_id === who));
  const openPeriod = { start: open.start, end: open.end, done: has(curKey) };
  const previousPeriod = { start: prevStart, end: periodForFrequency(kpi.frequency, prevStart).end, done: has(prevKey) };

  // Stand van de lopende periode zelf (dus niet die van een eerdere periode).
  const currentValue = byPeriod.get(curKey) ?? null;

  return {
    kpi, assignees, checkins, value, previous, status, ratio, diff, change, forecast, streak,
    lastCheckin: checkins[0] ?? null, openPeriod, previousPeriod, seriesValues: series,
    currentValue, currentRatio: kpiRatio(kpi, currentValue), currentStatus: kpiStatus(kpi, currentValue),
  };
}
