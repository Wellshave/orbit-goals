"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./org";

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
  const p = kpiPayload(fd);
  if (p.name.length < 2) return { error: "Geef de KPI een naam." };
  if (!Number.isFinite(p.target_value)) return { error: "Vul een targetwaarde in." };
  if (p.scope === "team" && !p.team_id) return { error: "Kies een team." };
  const { data: me } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const { data, error } = await supabase.from("kpis").insert({ ...p, org_id: me?.org_id, created_by: user.id }).select("id").single();
  if (error) return { error: error.message.includes("row-level security") ? "Je kunt alleen persoonlijke KPI's voor jezelf aanmaken." : error.message };
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
  const p = kpiPayload(fd);
  if (p.name.length < 2) return { error: "Geef de KPI een naam." };
  if (!Number.isFinite(p.target_value)) return { error: "Vul een targetwaarde in." };
  const { error } = await supabase.from("kpis").update(p).eq("id", id);
  if (error) return { error: error.message };
  await syncAssignees(supabase, id, fd, user.id);
  revalidatePath(`/kpis/${id}`);
  revalidatePath("/kpis");
  return { success: "KPI opgeslagen." };
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
  const { data: kpi } = await supabase.from("kpis").select("target_value, unit, name").eq("id", kpi_id).single();
  if (!kpi) return { error: "KPI niet gevonden." };
  const value = raw === "" ? (done ? Number(kpi.target_value) : NaN) : num(raw, NaN);
  if (!Number.isFinite(value)) return { error: "Vul een waarde in." };
  const { error } = await supabase
    .from("kpi_checkins")
    .upsert({ kpi_id, profile_id: user.id, period_start, period_end, value, note }, { onConflict: "kpi_id,profile_id,period_start" });
  if (error) return { error: error.message.includes("row-level security") ? "Deze KPI is niet aan jou toegewezen." : error.message };
  // Bewust geen revalidatePath: de client toont eerst de bevestiging en ververst daarna zelf.
  const back = str(fd.get("back"));
  if (back) redirect(back);
  return { success: `Check-in opgeslagen voor ${kpi.name}.` };
}
