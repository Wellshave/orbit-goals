"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./org";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";

async function sb() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? n : fallback;
};
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);

function goalPayload(fd: FormData) {
  const measure = str(fd.get("measure")) === "binary" ? "binary" : "numeric";
  const goal_type = str(fd.get("goal_type")) || "personal";
  return {
    title: str(fd.get("title")),
    description: str(fd.get("description")),
    goal_type,
    owner_id: str(fd.get("owner_id")),
    team_id: str(fd.get("team_id")) || null,
    parent_goal_id: str(fd.get("parent_goal_id")) || null,
    start_date: str(fd.get("start_date")),
    deadline: str(fd.get("deadline")),
    measure,
    unit: measure === "binary" ? "" : str(fd.get("unit")),
    start_value: measure === "binary" ? 0 : num(fd.get("start_value")),
    target_value: measure === "binary" ? 1 : num(fd.get("target_value"), 1),
    frequency: str(fd.get("frequency")) || "weekly",
    visibility: str(fd.get("visibility")) || (goal_type === "company" ? "company" : goal_type === "team" ? "team" : "private"),
    category: str(fd.get("category")) || "Algemeen",
    is_featured: fd.get("is_featured") === "on",
  };
}

function validateGoal(t: T, p: ReturnType<typeof goalPayload>): string | null {
  if (p.title.length < 3) return t("actions.goalTitle");
  if (!p.owner_id) return t("actions.chooseOwner");
  if (!p.start_date || !p.deadline) return t("actions.fillDates");
  if (p.deadline < p.start_date) return t("actions.deadlineBeforeStart");
  if (p.measure === "numeric" && p.target_value === p.start_value) return t("actions.targetDiffers");
  if (p.goal_type === "team" && !p.team_id) return t("actions.chooseTeam");
  if (p.goal_type === "company" && p.visibility !== "company") return t("actions.companyVisible");
  return null;
}

async function syncPeople(supabase: Awaited<ReturnType<typeof createClient>>, goalId: string, fd: FormData) {
  const assignees = list(fd, "assignee");
  const shares = list(fd, "share");
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

export async function createGoal(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await sb();
  const { t } = await getT();
  const p = goalPayload(fd);
  const err = validateGoal(t, p);
  if (err) return { error: err };
  const { data: me } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...p, org_id: me?.org_id, created_by: user.id, current_value: p.start_value })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("row-level security") ? t("actions.noRightsGoalType") : error.message };
  await syncPeople(supabase, data.id, fd);

  // Inline milestones (optioneel): name[] / target[] / date[] / reward[]
  const names = list(fd, "ms_name");
  if (names.length) {
    const targets = fd.getAll("ms_target").map(String);
    const dates = fd.getAll("ms_date").map(String);
    const rewardsT = fd.getAll("ms_reward").map(String);
    const rows = names.map((name, i) => ({ goal_id: data.id, name, target_value: p.measure === "binary" ? 1 : num(targets[i]), target_date: dates[i] || null, sort_order: i + 1, is_ultimate: i === names.length - 1 && fd.get("last_is_ultimate") === "on" }));
    const { data: ms } = await supabase.from("milestones").insert(rows).select("id, sort_order");
    const rewardRows = (ms ?? []).map((m) => ({ milestone_id: m.id as string, title: rewardsT[(m.sort_order as number) - 1] ?? "" })).filter((r) => r.title.trim());
    if (rewardRows.length) await supabase.from("rewards").insert(rewardRows);
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect(`/goals/${data.id}`);
}

export async function updateGoal(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const { supabase } = await sb();
  const { t } = await getT();
  const p = goalPayload(fd);
  const err = validateGoal(t, p);
  if (err) return { error: err };
  const { error } = await supabase.from("goals").update(p).eq("id", id);
  if (error) return { error: error.message };
  await syncPeople(supabase, id, fd);
  revalidatePath(`/goals/${id}`);
  revalidatePath("/goals");
  return { success: t("actions.goalSaved") };
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
  revalidatePath(`/goals/${goal_id}`);
  return { success: id ? t("actions.milestoneUpdated") : t("actions.milestoneAdded") };
}

export async function deleteMilestone(fd: FormData) {
  const id = str(fd.get("id"));
  const goal_id = str(fd.get("goal_id"));
  const { supabase } = await sb();
  await supabase.from("milestones").delete().eq("id", id);
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
