"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { ActionState } from "./org";
import { getT } from "@/lib/i18n/server";

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

function kpiPayload(fd: FormData) {
  const scope = str(fd.get("scope")) || "personal";
  return {
    name: str(fd.get("name")),
    description: str(fd.get("description")),
    category: str(fd.get("category")) || "Algemeen",
    scope,
    owner_id: str(fd.get("owner_id")) || null,
    team_id: str(fd.get("team_id")) || null,
    frequency: str(fd.get("frequency")) || "weekly",
    direction: str(fd.get("direction")) === "lower_better" ? "lower_better" : "higher_better",
    target_value: num(fd.get("target_value"), NaN),
    unit: str(fd.get("unit")),
    period_start: str(fd.get("period_start")) || new Date().toISOString().slice(0, 10),
    period_end: str(fd.get("period_end")) || null,
    source_note: str(fd.get("source_note")),
  };
}

async function syncAssignees(supabase: Awaited<ReturnType<typeof createClient>>, kpiId: string, fd: FormData, by: string) {
  const wanted = fd.getAll("assignee").map(String).filter(Boolean);
  const { data: cur } = await supabase.from("kpi_assignments").select("profile_id").eq("kpi_id", kpiId);
  const curIds = (cur ?? []).map((a) => a.profile_id as string);
  const add = wanted.filter((id) => !curIds.includes(id));
  const del = curIds.filter((id) => !wanted.includes(id));
  if (add.length) await supabase.from("kpi_assignments").insert(add.map((profile_id) => ({ kpi_id: kpiId, profile_id, assigned_by: by })));
  if (del.length) await supabase.from("kpi_assignments").delete().eq("kpi_id", kpiId).in("profile_id", del);
}

export async function createKpi(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await sb();
  const { t } = await getT();
  const p = kpiPayload(fd);
  if (p.name.length < 2) return { error: t("actions.kpiName") };
  if (!Number.isFinite(p.target_value)) return { error: t("actions.kpiTarget") };
  if (p.scope === "team" && !p.team_id) return { error: t("actions.kpiTeam") };
  const { data: me } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  // Een beheerder die een persoonlijke KPI voor één collega maakt: die collega is de eigenaar, niet de beheerder.
  const soleAssignee = fd.getAll("assignee").map(String).filter(Boolean);
  if (p.scope === "personal" && soleAssignee.length === 1 && (me?.role === "owner" || me?.role === "admin")) p.owner_id = soleAssignee[0];
  const { data, error } = await supabase.from("kpis").insert({ ...p, org_id: me?.org_id, created_by: user.id }).select("id").single();
  if (error) return { error: error.message.includes("row-level security") ? t("actions.kpiOnlyPersonal") : error.message };
  await syncAssignees(supabase, data.id, fd, user.id);
  if (p.scope === "personal" && p.owner_id && !fd.getAll("assignee").includes(p.owner_id)) {
    await supabase.from("kpi_assignments").upsert({ kpi_id: data.id, profile_id: p.owner_id, assigned_by: user.id });
  }
  revalidatePath("/kpis");
  redirect(`/kpis/${data.id}`);
}

export async function updateKpi(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const { supabase, user } = await sb();
  const { t } = await getT();
  const p = kpiPayload(fd);
  if (p.name.length < 2) return { error: t("actions.kpiName") };
  if (!Number.isFinite(p.target_value)) return { error: t("actions.kpiTarget") };
  const { error } = await supabase.from("kpis").update(p).eq("id", id);
  if (error) return { error: error.message };
  await syncAssignees(supabase, id, fd, user.id);
  revalidatePath(`/kpis/${id}`);
  revalidatePath("/kpis");
  return { success: t("actions.kpiSaved") };
}

export async function deleteKpi(fd: FormData) {
  const id = str(fd.get("id"));
  const { supabase } = await sb();
  await supabase.from("kpis").delete().eq("id", id);
  revalidatePath("/kpis");
  redirect("/kpis");
}

export async function checkinKpi(_p: ActionState, fd: FormData): Promise<ActionState> {
  const kpi_id = str(fd.get("kpi_id"));
  const period_start = str(fd.get("period_start"));
  const period_end = str(fd.get("period_end"));
  const note = str(fd.get("note"));
  const done = fd.get("done") === "on";
  const raw = str(fd.get("value"));
  const { supabase, user } = await sb();
  const { t } = await getT();
  const { data: kpi } = await supabase.from("kpis").select("target_value, unit, name").eq("id", kpi_id).single();
  if (!kpi) return { error: t("actions.kpiNotFound") };
  const value = raw === "" ? (done ? Number(kpi.target_value) : NaN) : num(raw, NaN);
  if (!Number.isFinite(value)) return { error: t("actions.fillAValue") };
  const { error } = await supabase
    .from("kpi_checkins")
    .upsert({ kpi_id, profile_id: user.id, period_start, period_end, value, note }, { onConflict: "kpi_id,profile_id,period_start" });
  if (error) return { error: error.message.includes("row-level security") ? t("actions.kpiNotAssigned") : error.message };
  revalidateCheckin(kpi_id);
  const back = str(fd.get("back"));
  if (back) redirect(back);
  return { success: t("actions.checkinSaved", { k: kpi.name }) };
}

/** Paden die een check-in raakt: de KPI zelf, de lijsten en de dashboards. */
function revalidateCheckin(kpiId: string) {
  revalidatePath(`/kpis/${kpiId}`);
  revalidatePath("/kpis");
  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath("/me");
}

/** Check-in terugdraaien. Alleen je eigen check-in; punten en tijdlijn-item gaan via de database mee. */
export async function deleteCheckin(_p: ActionState, fd: FormData): Promise<ActionState> {
  const kpi_id = str(fd.get("kpi_id"));
  const period_start = str(fd.get("period_start"));
  const { supabase, user } = await sb();
  const { t } = await getT();
  const { error } = await supabase.from("kpi_checkins").delete().eq("kpi_id", kpi_id).eq("profile_id", user.id).eq("period_start", period_start);
  if (error) return { error: error.message };
  revalidateCheckin(kpi_id);
  return { success: t("actions.checkinRemoved") };
}
