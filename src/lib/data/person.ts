import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEvent, Goal, GoalRoutine, GoalUpdate, Milestone, Notification, Reward, RoutineLog } from "@/lib/types";
import { listAssignments, listGoals, listMilestones } from "./goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis, type KpiView } from "./kpis";
import { routineStats, type RoutineStats } from "@/lib/goals/routine";
import { STATUS_ORDER, goalProgress, milestonePosition } from "@/lib/status";
import { nextMilestone } from "@/lib/explain";

export interface RoutineCard { routine: GoalRoutine; goal: Goal; stats: RoutineStats }
export interface UpcomingMilestone { goal: Goal; milestone: Milestone; reward: Reward | null; frac: number }
export interface EventGroup {
  key: string;
  actorId: string | null;
  goalId: string | null;
  kinds: Set<ActivityEvent["kind"]>;
  counts: Partial<Record<ActivityEvent["kind"], number>>;
  milestoneName?: string;
  assignees: string[];
  at: string;
}

export interface PersonOverview {
  /** Alle doelen van deze persoon die de kijker mag zien (RLS filtert privédoelen van anderen weg). */
  goals: Goal[];
  personalGoals: Goal[];
  sharedGoals: Goal[];
  attention: Goal[];
  milestones: Milestone[];
  rewards: Reward[];
  kpiViews: KpiView[];
  /** KPI's die deze persoon beheert maar die aan anderen zijn toegewezen (voor "KPI van … bekijken"). */
  managedKpiViews: { view: KpiView; assignee: string }[];
  routines: RoutineCard[];
  upcoming: UpcomingMilestone[];
  activity: EventGroup[];
  updates: GoalUpdate[];
  mentions: Notification[];
  /** Actieve doelen zonder update in de afgelopen 7 dagen. */
  staleGoalIds: Set<string>;
  peopleOf: (goalId: string) => string[];
}

/** Systeemruis samenvoegen: events van dezelfde persoon op hetzelfde doel binnen 45 minuten worden één regel. */
export function groupEvents(events: ActivityEvent[]): EventGroup[] {
  const WINDOW = 45 * 60_000;
  const groups: EventGroup[] = [];
  for (const e of events) {
    if (e.kind === "status_change") continue;
    const p = (e.payload ?? {}) as Record<string, string>;
    const last = groups[groups.length - 1];
    const sameBucket = last && last.actorId === e.actor_id && last.goalId === e.goal_id && Math.abs(new Date(last.at).getTime() - new Date(e.created_at).getTime()) <= WINDOW;
    const g = sameBucket ? last : { key: e.id, actorId: e.actor_id, goalId: e.goal_id, kinds: new Set<ActivityEvent["kind"]>(), counts: {}, assignees: [], at: e.created_at };
    g.kinds.add(e.kind);
    g.counts[e.kind] = (g.counts[e.kind] ?? 0) + 1;
    if (e.kind === "milestone_achieved" && p.name && !g.milestoneName) g.milestoneName = p.name;
    if (e.kind === "assignment" && p.profile_id && !g.assignees.includes(p.profile_id)) g.assignees.push(p.profile_id);
    if (!sameBucket) groups.push(g);
  }
  return groups;
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

  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([
    listAssignments(supabase, goalIds),
    listMilestones(supabase, goalIds),
    listKpiAssignments(supabase, kpiIds),
    listCheckins(supabase, kpiIds, { limit: 1000 }),
  ]);

  const theirGoals = goals.filter((g) => g.owner_id === personId || assignments.some((a) => a.goal_id === g.id && a.profile_id === personId));
  const theirGoalIds = theirGoals.map((g) => g.id);

  // Zelfde regel als op Vandaag: toegewezen KPI's, plus eigen KPI's die nog aan niemand zijn toegewezen.
  const theirKpis = kpis.filter((k) => kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === personId) || (k.owner_id === personId && !kpiAssignments.some((a) => a.kpi_id === k.id)));
  const kpiViews = theirKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period, personId));
  const managedKpiViews = kpis
    .filter((k) => (k.owner_id === personId || k.created_by === personId) && !theirKpis.includes(k))
    .flatMap((k) => {
      const assignee = kpiAssignments.find((a) => a.kpi_id === k.id && a.profile_id !== personId)?.profile_id;
      return assignee ? [{ view: buildKpiView(k, kpiAssignments, checkins, period, k.scope === "personal" ? assignee : undefined), assignee }] : [];
    });

  const idList = theirGoalIds.length ? theirGoalIds.join(",") : "00000000-0000-0000-0000-000000000000";
  const theirMilestoneIds = milestones.filter((m) => theirGoalIds.includes(m.goal_id)).map((m) => m.id);
  const logsFrom = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
  // Alles wat alleen van de eerste twee rondes afhangt in één keer, zodat de pagina niet op vijf opeenvolgende verzoeken wacht.
  const [routineRes, updatesRes, eventsRes, mentionsRes, logRes, rewardRes] = await Promise.all([
    theirGoalIds.length ? supabase.from("goal_routines").select("*").in("goal_id", theirGoalIds).order("created_at") : Promise.resolve({ data: [] }),
    theirGoalIds.length ? supabase.from("goal_updates").select("*").in("goal_id", theirGoalIds).order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    // Eigen acties plus wat anderen op diens doelen deden; RLS verbergt events van doelen die de kijker niet mag zien.
    supabase.from("activity_events").select("*").or(`actor_id.eq.${personId},goal_id.in.(${idList})`).order("created_at", { ascending: false }).limit(60),
    // Notificaties zijn alleen voor de ontvanger leesbaar, dus dit levert alleen iets op je eigen dashboard.
    supabase.from("notifications").select("*").eq("recipient_id", personId).in("kind", ["mention", "reply", "message"]).is("read_at", null).order("created_at", { ascending: false }).limit(5),
    // Logs van deze persoon; hieronder beperkt tot de routines van diens doelen.
    theirGoalIds.length ? supabase.from("routine_logs").select("*").eq("profile_id", personId).gte("logged_on", logsFrom) : Promise.resolve({ data: [] }),
    theirMilestoneIds.length ? supabase.from("rewards").select("*").in("milestone_id", theirMilestoneIds) : Promise.resolve({ data: [] }),
  ]);

  const routineList = (routineRes.data ?? []) as GoalRoutine[];
  const routineIds = new Set(routineList.map((r) => r.id));
  const logs = ((logRes.data ?? []) as RoutineLog[]).filter((l) => routineIds.has(l.routine_id));
  const routines: RoutineCard[] = routineList.flatMap((r) => {
    const goal = theirGoals.find((g) => g.id === r.goal_id);
    return goal && goal.status !== "achieved" ? [{ routine: r, goal, stats: routineStats(r, logs) }] : [];
  });

  // Milestones die binnen bereik komen, met de bijbehorende reward.
  const candidates = theirGoals.flatMap((g) => {
    if (g.status === "achieved") return [];
    const m = nextMilestone(g, milestones.filter((x) => x.goal_id === g.id));
    if (!m) return [];
    const pos = milestonePosition(g, m.target_value);
    const frac = pos > 0 ? Math.min(1, goalProgress(g) / pos) : 0;
    return [{ goal: g, milestone: m, frac }];
  }).sort((a, b) => b.frac - a.frac);
  const rewards = (rewardRes.data ?? []) as Reward[];
  const upcoming: UpcomingMilestone[] = candidates.map((c) => ({ ...c, reward: rewards.find((r) => r.milestone_id === c.milestone.id) ?? null }));

  const visibleIds = new Set(goalIds);
  const events = ((eventsRes.data ?? []) as ActivityEvent[]).filter((e) => !e.goal_id || visibleIds.has(e.goal_id));

  const attention = theirGoals
    .filter((g) => g.status === "behind" || g.status === "needs_attention")
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.deadline.localeCompare(b.deadline));

  const updates = (updatesRes.data ?? []) as GoalUpdate[];
  const staleCutoff = Date.now() - 7 * 86_400_000;
  const staleGoalIds = new Set(theirGoals.filter((g) => g.status !== "achieved").filter((g) => {
    const last = updates.find((u) => u.goal_id === g.id)?.created_at;
    return !last || new Date(last).getTime() < staleCutoff;
  }).map((g) => g.id));

  return {
    goals: theirGoals,
    personalGoals: theirGoals.filter((g) => g.goal_type === "personal"),
    sharedGoals: theirGoals.filter((g) => g.goal_type !== "personal"),
    attention,
    milestones,
    rewards,
    kpiViews,
    managedKpiViews,
    routines,
    upcoming,
    activity: groupEvents(events),
    updates,
    staleGoalIds,
    mentions: (mentionsRes.data ?? []) as Notification[],
    peopleOf: (goalId: string) => {
      const g = theirGoals.find((x) => x.id === goalId);
      const ids = assignments.filter((a) => a.goal_id === goalId).map((a) => a.profile_id);
      return g && !ids.includes(g.owner_id) ? [g.owner_id, ...ids] : ids;
    },
  };
}
