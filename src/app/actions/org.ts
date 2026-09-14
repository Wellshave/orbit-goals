"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string; data?: Record<string, string> } | undefined;

async function sb() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createOrganization(_p: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Geef je organisatie een naam." };
  const { supabase } = await sb();
  const { error } = await supabase.rpc("create_organization", { p_name: name });
  if (error) return { error: error.message };
  redirect("/onboarding?step=profile");
}

export async function acceptInvite(_p: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const { supabase } = await sb();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message };
  redirect("/onboarding?step=profile");
}

export async function joinWithCode(_p: ActionState, fd: FormData): Promise<ActionState> {
  const raw = String(fd.get("code") ?? "").trim();
  const token = raw.includes("/invite/") ? raw.split("/invite/")[1].split(/[?#]/)[0] : raw;
  if (!token) return { error: "Plak de uitnodigingslink of -code." };
  const { supabase } = await sb();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message };
  redirect("/onboarding?step=profile");
}

export async function updateProfile(_p: ActionState, fd: FormData): Promise<ActionState> {
  const full_name = String(fd.get("full_name") ?? "").trim();
  const job_title = String(fd.get("job_title") ?? "").trim();
  const next = String(fd.get("next") ?? "");
  if (full_name.length < 2) return { error: "Vul je naam in." };
  const { supabase, user } = await sb();
  const { error } = await supabase.from("profiles").update({ full_name, job_title, onboarded: true }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  if (next) redirect(next);
  return { success: "Profiel opgeslagen." };
}

export async function updateOrganization(_p: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  const product_name = String(fd.get("product_name") ?? "").trim() || "Orbit";
  const id = String(fd.get("id") ?? "");
  if (name.length < 2) return { error: "Vul een organisatienaam in." };
  const { supabase } = await sb();
  const { error } = await supabase.from("organizations").update({ name, product_name }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: "Organisatie bijgewerkt." };
}

export async function inviteMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "member");
  const org_id = String(fd.get("org_id") ?? "");
  if (!email.includes("@")) return { error: "Vul een geldig e-mailadres in." };
  const { supabase, user } = await sb();
  const { data, error } = await supabase
    .from("invitations")
    .insert({ org_id, email, role, invited_by: user.id })
    .select("token")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/settings");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { success: `Uitnodiging aangemaakt voor ${email}.`, data: { link: `${base}/invite/${data.token}` } };
}

export async function revokeInvite(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const { supabase } = await sb();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/settings");
}

export async function setMemberRole(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = String(fd.get("profile_id") ?? "");
  const role = String(fd.get("role") ?? "member");
  const { supabase } = await sb();
  const { error } = await supabase.rpc("set_member_role", { p_profile: profile, p_role: role });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/people");
  return { success: "Rol bijgewerkt." };
}

export async function removeMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = String(fd.get("profile_id") ?? "");
  const { supabase } = await sb();
  const { error } = await supabase.rpc("remove_member", { p_profile: profile });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/people");
  return { success: "Teamlid verwijderd uit de organisatie." };
}

export async function createTeam(_p: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const color = String(fd.get("color") ?? "#496CFF");
  const org_id = String(fd.get("org_id") ?? "");
  if (name.length < 2) return { error: "Geef het team een naam." };
  const { supabase, user } = await sb();
  const { data, error } = await supabase.from("teams").insert({ org_id, name, description, color, created_by: user.id }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/teams");
  redirect(`/teams/${data.id}`);
}

export async function updateTeam(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const color = String(fd.get("color") ?? "#496CFF");
  if (name.length < 2) return { error: "Geef het team een naam." };
  const { supabase } = await sb();
  const { error } = await supabase.from("teams").update({ name, description, color }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/teams/${id}`);
  revalidatePath("/teams");
  return { success: "Team bijgewerkt." };
}

export async function deleteTeam(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const { supabase } = await sb();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/teams");
  redirect("/teams");
}

export async function setTeamMembership(fd: FormData) {
  const team_id = String(fd.get("team_id") ?? "");
  const profile_id = String(fd.get("profile_id") ?? "");
  const op = String(fd.get("op") ?? "add");
  const { supabase } = await sb();
  if (op === "remove") {
    await supabase.from("team_memberships").delete().eq("team_id", team_id).eq("profile_id", profile_id);
  } else if (op === "lead") {
    await supabase.from("team_memberships").update({ is_lead: true }).eq("team_id", team_id).eq("profile_id", profile_id);
  } else {
    await supabase.from("team_memberships").upsert({ team_id, profile_id });
  }
  revalidatePath(`/teams/${team_id}`);
  revalidatePath("/teams");
  revalidatePath("/people");
}
