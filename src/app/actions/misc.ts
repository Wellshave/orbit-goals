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

export async function saveFilter(_p: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  const route = String(fd.get("route") ?? "/dashboard");
  const query = String(fd.get("query") ?? "");
  if (!name) return { error: "Geef de weergave een naam." };
  const { supabase, user } = await sb();
  const { data: me } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const { error } = await supabase.from("saved_filters").insert({ org_id: me?.org_id, profile_id: user.id, name, route, query });
  if (error) return { error: error.message };
  revalidatePath(route);
  return { success: "Weergave opgeslagen." };
}

export async function deleteFilter(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const route = String(fd.get("route") ?? "/dashboard");
  const { supabase } = await sb();
  await supabase.from("saved_filters").delete().eq("id", id);
  revalidatePath(route);
}

export async function markNotificationRead(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const href = String(fd.get("href") ?? "");
  const { supabase } = await sb();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  if (href) redirect(href);
}

export async function markAllRead() {
  const { supabase, user } = await sb();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
