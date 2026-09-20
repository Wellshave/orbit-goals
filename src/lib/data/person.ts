import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEvent, Goal, GoalRoutine, Milestone, Reward, RoutineLog } from "@/lib/types";
import { listAssignments, listGoals, listMilestones } from "./goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis, type KpiView } from "./kpis";
import { routineStats, type RoutineStats } from "@/lib/goals/routine";
import { goalProgress, milestonePosition } from "@/lib/status";
import { nextMilestone } from "@/lib/explain";

export interface RoutineCard { routine: GoalRoutine; goal: Goal; stats: RoutineStats }
export interface UpcomingMilestone { goal: Goal; milestone: Milestone; reward: Reward | null; frac: number }

export interface PersonOverview {
  /** Alle doelen van deze persoon die de kijker mag zien (RLS filtert privédoelen van anderen weg). */
  goals: Goal[];
  personalGoals: Goal[];
  sharedGoals: Goal[];
  attention: Goal[];
  achieved: Goal[];
  milestones: Milestone[];
  kpiViews: KpiView[];
  routines: RoutineCard[];
  upcoming: UpcomingMilestone[];
  events: ActivityEvent[];
  peopleOf: (goalId: string) => string[];
}

/**
 * Alles wat op het persoonlijke dashboard van één persoon hoort.
 * De zichtbaarheid komt volledig van RLS: wat de kijker niet mag zien, komt hier niet binnen.
 */
export async function getPersonOverview(
  supabase: SupabaseClient,
  orgId: string,
  personId: string,
  period: { from: Date; to: Date },
): Promise<PersonOverview> {
  const [goals, kpis] = await Promise.all([listGoals(supabase, orgId), listKpis(supabase, orgId)]);
  const goalIds = goals.map((g) => g.id);
  const kpiIds = kpis.map((k) => k.id);

  const [assignments, milestones, kpiAssignments, checkins, eventsRes] = await Promise.all([
    listAssignments(supabase, goalIds),
    listMilestones(supabase, goalIds),
    listKpiAssignments(supabase, kpiIds),
    listCheckins(supabase, kpiIds, { limit: 1000 }),
    supabase.from("activity_events").select("*").eq("actor_id", personId).order("created_at", { ascending: false }).limit(15),
  ]);

  const theirGoals = goals.filter((g) => g.owner_id === personId || assignments.some((a) => a.goal_id === g.id && a.profile_id === personId));
  const theirGoalIds = theirGoals.map((g) => g.id);

  // Zelfde regel als op Vandaag: toegewezen KPI's, plus eigen KPI's die nog aan niemand zijn toegewezen.
  const theirKpis = kpis.filter((k) => kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === personId) || (k.owner_id === personId && !kpiAssignments.some((a) => a.kpi_id === k.id)));
  const kpiViews = theirKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period, personId));

  const { data: routineRows } = theirGoalIds.length
    ? await supabase.from("goal_routines").select("*").in("goal_id", theirGoalIds).order("created_at")
    : { data: [] };
  const routineList = (routineRows ?? []) as GoalRoutine[];
  const { data: logRows } = routineList.length
    ? await supabase.from("routine_logs").select("*").in("routine_id", routineList.map((r) => r.id)).eq("profile_id", personId).gte("logged_on", new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10))
    : { data: [] };
  const logs = (logRows ?? []) as RoutineLog[];
  const routines: RoutineCard[] = routineList.flatMap((r) => {
    const goal = theirGoals.find((g) => g.id === r.goal_id);
    return goal ? [{ routine: r, goal, stats: routineStats(r, logs) }] : [];
  });

  // Milestones die binnen bereik komen, met de bijbehorende reward.
  const candidates = theirGoals.flatMap((g) => {
    if (g.status === "achieved") return [];
    const m = nextMilestone(g, milestones.filter((x) => x.goal_id === g.id));
    if (!m) return [];
    const pos = milestonePosition(g, m.target_value);
    const frac = pos > 0 ? Math.min(1, goalProgress(g) / pos) : 0;
    return [{ goal: g, milestone: m, frac }];
  }).sort((a, b) => b.frac - a.frac).slice(0, 4);
  const { data: rewardRows } = candidates.length
    ? await supabase.from("rewards").select("*").in("milestone_id", candidates.map((c) => c.milestone.id))
    : { data: [] };
  const rewards = (rewardRows ?? []) as Reward[];
  const upcoming: UpcomingMilestone[] = candidates.map((c) => ({ ...c, reward: rewards.find((r) => r.milestone_id === c.milestone.id) ?? null }));

  const visibleIds = new Set(goalIds);
  const events = ((eventsRes.data ?? []) as ActivityEvent[]).filter((e) => !e.goal_id || visibleIds.has(e.goal_id));

  return {
    goals: theirGoals,
    personalGoals: theirGoals.filter((g) => g.goal_type === "personal"),
    sharedGoals: theirGoals.filter((g) => g.goal_type !== "personal"),
    attention: theirGoals.filter((g) => g.status === "behind" || g.status === "needs_attention"),
    achieved: theirGoals.filter((g) => g.status === "achieved"),
    milestones,
    kpiViews,
    routines,
    upcoming,
    events,
    peopleOf: (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => a.profile_id),
  };
}
