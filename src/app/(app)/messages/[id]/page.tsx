import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { listConversations, listThread } from "@/lib/data/messages";
import { ConversationList } from "@/components/messages/conversation-list";
import { ThreadView } from "@/components/messages/thread-view";
import { HelpButton } from "@/components/help/help-button";

export async function generateMetadata({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return { title: data?.full_name ? data.full_name : { absolute: "Orbit" } };
}

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const { supabase, profile, locale, t } = await getSession();
  const dir = await getDirectory();
  const other = dir.byId.get(id);
  if (!other || other.id === profile.id) notFound();

  // Openen = gelezen: markeert berichten van deze collega en de bijbehorende melding.
  await supabase.rpc("mark_dm_read", { p_other: other.id });
  const [messages, conversations] = await Promise.all([listThread(supabase, profile.id, other.id), listConversations(supabase, profile.id)]);
  const items = conversations.flatMap((c) => { const person = dir.byId.get(c.otherId); return person ? [{ person, last: c.last, unread: c.unread }] : []; });

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages" className="press inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> {t("messages.back")}</Link>
        <HelpButton topic="messages" />
      </div>
      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        <aside className="hidden lg:block" aria-label={t("messages.conversations")}>
          <ConversationList items={items} activeId={other.id} me={profile.id} t={t} locale={locale} />
        </aside>
        <ThreadView meId={profile.id} other={other} messages={messages} />
      </div>
    </div>
  );
}
