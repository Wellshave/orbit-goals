import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, GoalAssignment, GoalRoutine, GoalShare, GoalUpdate, Milestone, Reward, RoutineLog, Comment, Reaction, Recognition, ActivityEvent } from "@/lib/types";

export async function listGoals(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase.from("goals").select("*").eq("org_id", orgId).order("is_featured", { ascending: false }).order("deadline");
  return (data ?? []) as Goal[];
}

export async function listAssignments(supabase: SupabaseClient, goalIds: string[]) {
  if (goalIds.length === 0) return [] as GoalAssignment[];
  const { data } = await supabase.from("goal_assignments").select("*").in("goal_id", goalIds);
  return (data ?? []) as GoalAssignment[];
}

export async function listMilestones(supabase: SupabaseClient, goalIds: string[]) {
  if (goalIds.length === 0) return [] as Milestone[];
  const { data } = await supabase.from("milestones").select("*").in("goal_id", goalIds).order("sort_order");
  return (data ?? []) as Milestone[];
}

export async function getGoalBundle(supabase: SupabaseClient, id: string) {
  const { data: goal } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
  if (!goal) return null;
  const [assignments, shares, updates, milestones, comments, events, parent, children, routinesRes] = await Promise.all([
    supabase.from("goal_assignments").select("*").eq("goal_id", id),
    supabase.from("goal_shares").select("*").eq("goal_id", id),
    supabase.from("goal_updates").select("*").eq("goal_id", id).order("created_at", { ascending: false }),
    supabase.from("milestones").select("*").eq("goal_id", id).order("sort_order"),
    supabase.from("comments").select("*").eq("goal_id", id).order("created_at"),
    supabase.from("activity_events").select("*").eq("goal_id", id).order("created_at", { ascending: false }).limit(60),
    goal.parent_goal_id ? supabase.from("goals").select("*").eq("id", goal.parent_goal_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("goals").select("*").eq("parent_goal_id", id),
    supabase.from("goal_routines").select("*").eq("goal_id", id).order("created_at"),
  ]);
  const routines = (routinesRes.data ?? []) as GoalRoutine[];
  const since = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
  const { data: logRows } = routines.length ? await supabase.from("routine_logs").select("*").in("routine_id", routines.map((r) => r.id)).gte("logged_on", since).order("logged_on", { ascending: false }).order("created_at", { ascending: false }) : { data: [] };
  const ms = (milestones.data ?? []) as Milestone[];
  const cms = (comments.data ?? []) as Comment[];
  const ups = (updates.data ?? []) as GoalUpdate[];
  const [rewards, reactions, recognitions] = await Promise.all([
    ms.length ? supabase.from("rewards").select("*").in("milestone_id", ms.map((m) => m.id)) : Promise.resolve({ data: [] }),
    cms.length ? supabase.from("reactions").select("*").in("comment_id", cms.map((c) => c.id)) : Promise.resolve({ data: [] }),
    ups.length ? supabase.from("recognitions").select("*").in("goal_update_id", ups.map((u) => u.id)) : Promise.resolve({ data: [] }),
  ]);
  return {
    goal: goal as Goal,
    assignments: (assignments.data ?? []) as GoalAssignment[],
    shares: (shares.data ?? []) as GoalShare[],
    updates: ups,
    milestones: ms,
    rewards: (rewards.data ?? []) as Reward[],
    comments: cms,
    reactions: (reactions.data ?? []) as Reaction[],
    recognitions: (recognitions.data ?? []) as Recognition[],
    events: (events.data ?? []) as ActivityEvent[],
    parent: (parent.data ?? null) as Goal | null,
    children: (children.data ?? []) as Goal[],
    routines,
    routineLogs: (logRows ?? []) as RoutineLog[],
  };
}

/** Waarde van een doel aan het begin van een periode (op basis van de update-historie). */
export function valueAt(goal: Goal, updates: GoalUpdate[], at: Date): number {
  const before = updates.filter((u) => new Date(u.created_at) < at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (before.length === 0) {
    return new Date(goal.created_at) < at ? goal.start_value : goal.start_value;
  }
  return before[before.length - 1].new_value;
}
