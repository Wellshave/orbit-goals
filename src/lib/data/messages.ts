import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectMessage } from "@/lib/types";

export interface ConversationSummary { otherId: string; last: DirectMessage; unread: number; }

/** Gesprekken van mij, nieuwste eerst. RLS geeft alleen berichten terug waar ik afzender of ontvanger ben. */
export async function listConversations(supabase: SupabaseClient, me: string): Promise<ConversationSummary[]> {
  const { data } = await supabase.from("direct_messages").select("*").order("created_at", { ascending: false }).limit(1000);
  const byOther = new Map<string, ConversationSummary>();
  for (const m of (data ?? []) as DirectMessage[]) {
    const otherId = m.sender_id === me ? m.recipient_id : m.sender_id;
    const c = byOther.get(otherId);
    const isUnread = m.recipient_id === me && !m.read_at;
    if (!c) byOther.set(otherId, { otherId, last: m, unread: isUnread ? 1 : 0 });
    else if (isUnread) c.unread += 1;
  }
  return Array.from(byOther.values());
}

export async function listThread(supabase: SupabaseClient, me: string, other: string, limit = 300): Promise<DirectMessage[]> {
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as DirectMessage[]).reverse();
}
