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

/** Herkent @Naam Achternaam in de tekst op basis van de organisatieleden. */
function findMentions(body: string, members: { id: string; full_name: string }[]): string[] {
  const lower = body.toLowerCase();
  return members.filter((m) => m.full_name && lower.includes(`@${m.full_name.toLowerCase()}`)).map((m) => m.id);
}

export async function addComment(_p: ActionState, fd: FormData): Promise<ActionState> {
  const goal_id = String(fd.get("goal_id") ?? "");
  const parent_comment_id = String(fd.get("parent_comment_id") ?? "") || null;
  const goal_update_id = String(fd.get("goal_update_id") ?? "") || null;
  const body = String(fd.get("body") ?? "").trim();
  if (body.length < 1) return { error: "Schrijf eerst een bericht." };
  const { supabase, user } = await sb();
  const { data: me } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const { data: c, error } = await supabase
    .from("comments")
    .insert({ org_id: me?.org_id, goal_id, parent_comment_id, goal_update_id, author_id: user.id, body })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const { data: members } = await supabase.from("profiles").select("id, full_name").eq("org_id", me?.org_id);
  const explicit = fd.getAll("mention").map(String).filter(Boolean);
  const ids = Array.from(new Set([...findMentions(body, members ?? []), ...explicit])).filter((id) => id !== user.id);
  if (ids.length) await supabase.from("mentions").insert(ids.map((profile_id) => ({ comment_id: c.id, profile_id })));
  revalidatePath(`/goals/${goal_id}`);
  return { success: "Geplaatst." };
}

export async function deleteComment(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const goal_id = String(fd.get("goal_id") ?? "");
  const { supabase } = await sb();
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/goals/${goal_id}`);
}

export async function toggleReaction(fd: FormData) {
  const comment_id = String(fd.get("comment_id") ?? "");
  const goal_id = String(fd.get("goal_id") ?? "");
  const kind = String(fd.get("kind") ?? "like") === "ack" ? "ack" : "like";
  const { supabase, user } = await sb();
  const { data: ex } = await supabase.from("reactions").select("comment_id").eq("comment_id", comment_id).eq("profile_id", user.id).eq("kind", kind).maybeSingle();
  if (ex) await supabase.from("reactions").delete().eq("comment_id", comment_id).eq("profile_id", user.id).eq("kind", kind);
  else await supabase.from("reactions").insert({ comment_id, profile_id: user.id, kind });
  revalidatePath(`/goals/${goal_id}`);
}
