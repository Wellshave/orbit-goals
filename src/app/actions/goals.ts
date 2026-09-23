"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { ActionState } from "./org";
import { getT } from "@/lib/i18n/server";
import type { GoalDetails } from "@/lib/types";
import { emptyDraft, firstInvalidStep, mapDraft, type Draft } from "@/lib/goals/draft";
import { toSeconds } from "@/lib/format";

async function sb() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) redirect("/login");
  return { supabase, user };
}

const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? n : fallback;
};
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

type Sb = Awaited<ReturnType<typeof createClient>>;

async function syncPeople(supabase: Sb, goalId: string, assignees: string[], shares: string[]) {
  const { data: curA } = await supabase.from("goal_assignments").select("profile_id").eq("goal_id", goalId);
  const curAIds = (curA ?? []).map((a) => a.profile_id as string);
  const toAddA = assignees.filter((id) => !curAIds.includes(id));
  const toDelA = curAIds.filter((id) => !assignees.includes(id));
  if (toAddA.length) await supabase.from("goal_assignments").insert(toAddA.map((profile_id) => ({ goal_id: goalId, profile_id, is_responsible: true })));
  if (toDelA.length) await supabase.from("goal_assignments").delete().eq("goal_id", goalId).in("profile_id", toDelA);
  const { data: curS } = await supabase.from("goal_shares").select("profile_id").eq("goal_id", goalId);
  const curSIds = (curS ?? []).map((a) => a.profile_id as string);
  const toAddS = shares.filter((id) => !curSIds.includes(id));
  const toDelS = curSIds.filter((id) => !shares.includes(id));
  if (toAddS.length) await supabase.from("goal_shares").insert(toAddS.map((profile_id) => ({ goal_id: goalId, profile_id })));
  if (toDelS.length) await supabase.from("goal_shares").delete().eq("goal_id", goalId).in("profile_id", toDelS);
}

/**
 * Doel aanmaken of bewerken vanuit de wizard. Het concept komt als JSON binnen en wordt hier opnieuw
 * gevalideerd en naar het goalmodel vertaald; rechten worden door RLS afgedwongen.
 */
export async function saveGoalDraft(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const { supabase, user } = await sb();
  const { t } = await getT();
  let draft: Draft;
  try {
    const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as Partial<Draft>;
    draft = { ...emptyDraft(user.id), ...raw, routine: { ...emptyDraft(user.id).routine, ...(raw.routine ?? {}) } };
  } catch {
    return { error: t("wizard.err.generic") };
  }
  const { data: me } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!me?.org_id) redirect("/onboarding");
  const isAdmin = me.role === "owner" || me.role === "admin";
  if (!isAdmin && !id) { draft.scope = "personal"; draft.ownerId = user.id; }
  if (!isAdmin) { draft.featured = false; if (draft.scope === "personal") { draft.parentId = ""; draft.assignees = []; } }
  if (draft.scope === "personal" && draft.visibility === "company") draft.visibility = "private";
  if (!draft.ownerId) draft.ownerId = user.id;
  draft.milestones = Array.isArray(draft.milestones) ? draft.milestones.slice(0, 30) : [];

  const bad = firstInvalidStep(draft);
  if (bad) return { error: t(bad.key), data: { step: String(bad.step) } };

  let existingSteps: number | undefined;
  if (id) {
    const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true }).eq("goal_id", id);
    existingSteps = count ?? 0;
  }
  const mapped = mapDraft(draft, { stepsUnit: t("wizard.stepsUnit"), defaultCategory: t("goalCat.other"), existingSteps });
  const shares = mapped.goal.visibility === "shared" ? draft.shares.filter((s) => s !== user.id) : [];
  const assignees = draft.scope === "personal" ? [] : draft.assignees;

  if (id) {
    const { error } = await supabase.from("goals").update(mapped.goal).eq("id", id);
    if (error) return { error: error.message.includes("row-level security") ? t("actions.noRightsGoalType") : error.message };
    await syncPeople(supabase, id, assignees, shares);
    const { data: existing } = await supabase.from("goal_routines").select("id").eq("goal_id", id).order("created_at").limit(1).maybeSingle();
    if (mapped.routine) {
      if (existing) await supabase.from("goal_routines").update(mapped.routine).eq("id", existing.id);
      else await supabase.from("goal_routines").insert({ ...mapped.routine, goal_id: id });
    } else if (existing) {
      await supabase.from("goal_routines").delete().eq("id", existing.id);
    }
    revalidatePath(`/goals/${id}`);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    redirect(`/goals/${id}`);
  }

  const startCurrent = mapped.goal.details.prep_longest ?? mapped.goal.start_value;
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...mapped.goal, org_id: me.org_id, created_by: user.id, current_value: startCurrent })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("row-level security") ? t("actions.noRightsGoalType") : error.message };
  await syncPeople(supabase, data.id, assignees, shares);
  if (mapped.milestones.length) {
    const rows = mapped.milestones.map((m) => ({ goal_id: data.id, name: m.name, target_value: m.target_value, target_date: m.target_date, sort_order: m.sort_order, is_ultimate: m.is_ultimate }));
    const { data: ms } = await supabase.from("milestones").insert(rows).select("id, sort_order");
    const rewardRows = (ms ?? []).map((m) => ({ milestone_id: m.id as string, title: mapped.milestones[(m.sort_order as number) - 1]?.reward ?? "" })).filter((r) => r.title);
    if (rewardRows.length) await supabase.from("rewards").insert(rewardRows);
  }
  if (mapped.routine) await supabase.from("goal_routines").insert({ ...mapped.routine, goal_id: data.id });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect(`/goals/${data.id}`);
}

/** Bij stap-doelen (project / iets bereiken met stappen) volgen nummering en target het aantal milestones. */
async function resyncSteps(supabase: Sb, goalId: string) {
  const { data: goal } = await supabase.from("goals").select("details, current_value").eq("id", goalId).maybeSingle();
  if ((goal?.details as GoalDetails | null)?.track !== "steps") return;
  const { data: ms } = await supabase.from("milestones").select("id, sort_order, target_value, created_at").eq("goal_id", goalId).order("sort_order").order("created_at");
  const list = ms ?? [];
  for (let i = 0; i < list.length; i++) {
    if (Number(list[i].target_value) !== i + 1 || list[i].sort_order !== i + 1) await supabase.from("milestones").update({ target_value: i + 1, sort_order: i + 1, is_ultimate: i === list.length - 1 }).eq("id", list[i].id);
  }
  const target = Math.max(1, list.length);
  await supabase.from("goals").update({ target_value: target, current_value: Math.min(Number(goal?.current_value ?? 0), target) }).eq("id", goalId);
}

export async function deleteGoal(fd: FormData) {
  const id = str(fd.get("id"));
  const { supabase } = await sb();
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/goals");
  redirect("/goals");
}

export async function addProgress(_p: ActionState, fd: FormData): Promise<ActionState> {
  const goal_id = str(fd.get("goal_id"));
  const note = str(fd.get("note"));
  const mode = str(fd.get("mode")); // absolute | delta | done
  const { supabase, user } = await sb();
  const { t } = await getT();
  const { data: goal } = await supabase.from("goals").select("current_value, measure, unit, title").eq("id", goal_id).single();
  if (!goal) return { error: t("actions.goalNotFound") };
  let new_value: number;
  if (goal.measure === "binary") {
    new_value = mode === "undo" ? 0 : 1;
  } else if (mode === "delta") {
    const d = num(fd.get("value"), NaN);
    if (!Number.isFinite(d) || d === 0) return { error: t("actions.fillDelta") };
    new_value = Number(goal.current_value) + d;
  } else if (fd.has("t_h") || fd.has("t_m") || fd.has("t_s")) {
    const secs = toSeconds(str(fd.get("t_h")), str(fd.get("t_m")), str(fd.get("t_s")));
    if (secs <= 0) return { error: t("actions.fillValue") };
    new_value = secs;
  } else {
    const v = num(fd.get("value"), NaN);
    if (!Number.isFinite(v)) return { error: t("actions.fillValue") };
    new_value = v;
  }
  const { data: before } = await supabase.from("milestones").select("id").eq("goal_id", goal_id).eq("status", "pending");
  const { error } = await supabase.from("goal_updates").insert({ goal_id, profile_id: user.id, previous_value: goal.current_value, new_value, note });
  if (error) return { error: error.message.includes("row-level security") ? t("actions.noProgressRights") : error.message };
  const { data: after } = await supabase.from("milestones").select("id").eq("goal_id", goal_id).eq("status", "pending");
  const beforeIds = new Set((before ?? []).map((m) => m.id));
  const afterIds = new Set((after ?? []).map((m) => m.id));
  const achieved = Array.from(beforeIds).find((id) => !afterIds.has(id));
  revalidatePath(`/goals/${goal_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/company");
  if (achieved) redirect(`/goals/${goal_id}?celebrate=${achieved}`);
  return { success: t("actions.progressAdded") };
}

export async function saveMilestone(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const goal_id = str(fd.get("goal_id"));
  const payload = {
    name: str(fd.get("name")),
    description: str(fd.get("description")),
    target_value: num(fd.get("target_value")),
    target_date: str(fd.get("target_date")) || null,
    is_ultimate: fd.get("is_ultimate") === "on",
    sort_order: num(fd.get("sort_order"), 0),
  };
  const { t } = await getT();
  if (payload.name.length < 1) return { error: t("actions.milestoneName") };
  const { supabase } = await sb();
  let milestoneId = id;
  if (id) {
    const { error } = await supabase.from("milestones").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("milestones").insert({ ...payload, goal_id }).select("id").single();
    if (error) return { error: error.message };
    milestoneId = data.id;
  }
  const rewardTitle = str(fd.get("reward_title"));
  const rewardKind = str(fd.get("reward_kind")) || "other";
  const rewardDesc = str(fd.get("reward_description"));
  const { data: existing } = await supabase.from("rewards").select("id").eq("milestone_id", milestoneId).maybeSingle();
  if (rewardTitle) {
    if (existing) await supabase.from("rewards").update({ title: rewardTitle, kind: rewardKind, description: rewardDesc }).eq("id", existing.id);
    else await supabase.from("rewards").insert({ milestone_id: milestoneId, title: rewardTitle, kind: rewardKind, description: rewardDesc });
  } else if (existing) {
    await supabase.from("rewards").delete().eq("id", existing.id);
  }
  await resyncSteps(supabase, goal_id);
  revalidatePath(`/goals/${goal_id}`);
  return { success: id ? t("actions.milestoneUpdated") : t("actions.milestoneAdded") };
}

export async function deleteMilestone(fd: FormData) {
  const id = str(fd.get("id"));
  const goal_id = str(fd.get("goal_id"));
  const { supabase } = await sb();
  await supabase.from("milestones").delete().eq("id", id);
  await resyncSteps(supabase, goal_id);
  revalidatePath(`/goals/${goal_id}`);
}

export async function grantReward(fd: FormData) {
  const id = str(fd.get("id"));
  const goal_id = str(fd.get("goal_id"));
  const undo = fd.get("undo") === "1";
  const { supabase } = await sb();
  await supabase.from("rewards").update({ granted_at: undo ? null : new Date().toISOString() }).eq("id", id);
  revalidatePath(`/goals/${goal_id}`);
}

export async function toggleRecognition(fd: FormData) {
  const goal_update_id = str(fd.get("goal_update_id"));
  const goal_id = str(fd.get("goal_id"));
  const { supabase, user } = await sb();
  const { data: ex } = await supabase.from("recognitions").select("goal_update_id").eq("goal_update_id", goal_update_id).eq("recognized_by", user.id).maybeSingle();
  if (ex) await supabase.from("recognitions").delete().eq("goal_update_id", goal_update_id).eq("recognized_by", user.id);
  else await supabase.from("recognitions").insert({ goal_update_id, recognized_by: user.id });
  revalidatePath(`/goals/${goal_id}`);
}

/** Eén uitvoering van de gekoppelde routine loggen (bijv. een training). Een gelogde afstand kan het hoofddoel bijwerken. */
export async function logRoutine(_p: ActionState, fd: FormData): Promise<ActionState> {
  const routine_id = str(fd.get("routine_id"));
  const goal_id = str(fd.get("goal_id"));
  const note = str(fd.get("note"));
  const logged_on = str(fd.get("logged_on")) || new Date().toISOString().slice(0, 10);
  const qRaw = str(fd.get("quantity"));
  const quantity = qRaw ? num(qRaw, NaN) : null;
  const { supabase, user } = await sb();
  const { t } = await getT();
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) return { error: t("actions.fillValue") };
  if (logged_on > new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)) return { error: t("routine.noFuture") };
  const { error } = await supabase.from("routine_logs").insert({ routine_id, profile_id: user.id, logged_on, quantity, note });
  if (error) return { error: error.message.includes("row-level security") ? t("actions.noProgressRights") : error.message };

  let celebrate: string | undefined;
  if (quantity && quantity > 0) {
    const { data: goal } = await supabase.from("goals").select("current_value, target_value, start_value, format, details, measure").eq("id", goal_id).maybeSingle();
    const det = (goal?.details ?? {}) as GoalDetails;
    // Alleen bij "iets bereiken" met een hoeveelheid telt de langste gelogde afstand als voortgang op het hoofddoel.
    if (goal && goal.format === "achievement" && goal.measure === "numeric" && det.track === "value" && quantity > Number(goal.current_value)) {
      const { data: before } = await supabase.from("milestones").select("id").eq("goal_id", goal_id).eq("status", "pending");
      await supabase.from("goal_updates").insert({ goal_id, profile_id: user.id, previous_value: goal.current_value, new_value: Math.min(quantity, Number(goal.target_value)), note: note || t("routine.autoNote") });
      const { data: after } = await supabase.from("milestones").select("id").eq("goal_id", goal_id).eq("status", "pending");
      const afterIds = new Set((after ?? []).map((m) => m.id));
      celebrate = (before ?? []).map((m) => m.id as string).find((mid) => !afterIds.has(mid));
    }
  }
  revalidatePath(`/goals/${goal_id}`);
  revalidatePath("/dashboard");
  if (celebrate) redirect(`/goals/${goal_id}?celebrate=${celebrate}`);
  return { success: t("routine.logged") };
}

export async function deleteRoutineLog(fd: FormData) {
  const id = str(fd.get("id"));
  const goal_id = str(fd.get("goal_id"));
  const { supabase } = await sb();
  await supabase.from("routine_logs").delete().eq("id", id);
  revalidatePath(`/goals/${goal_id}`);
}
