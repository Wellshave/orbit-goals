"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export type MessageState = { error?: string; sentAt?: number } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function sendMessage(_p: MessageState, fd: FormData): Promise<MessageState> {
  const to = String(fd.get("to") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  const { t } = await getT();
  if (!UUID.test(to)) return { error: t("messages.notFound") };
  if (!body) return { error: t("messages.fillMessage") };
  if (body.length > 4000) return { error: t("messages.tooLong") };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!me?.org_id) redirect("/onboarding");
  // Geen .select() na de insert: de rij hoeft niet terug en zo speelt RLS-op-RETURNING geen rol.
  const { error } = await supabase.from("direct_messages").insert({ org_id: me.org_id, sender_id: user.id, recipient_id: to, body });
  if (error) return { error: error.code === "42501" ? t("messages.notFound") : error.message };
  revalidatePath(`/messages/${to}`);
  revalidatePath("/messages");
  return { sentAt: Date.now() };
}
