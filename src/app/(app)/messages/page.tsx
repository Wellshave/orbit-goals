import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { listConversations } from "@/lib/data/messages";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, Panel } from "@/components/ui";
import { ConversationList } from "@/components/messages/conversation-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("messages.title") };
}

export default async function MessagesPage() {
  const { supabase, profile, locale, t } = await getSession();
  const dir = await getDirectory();
  const conversations = await listConversations(supabase, profile.id);
  const items = conversations.flatMap((c) => { const person = dir.byId.get(c.otherId); return person ? [{ person, last: c.last, unread: c.unread }] : []; });
  const others = dir.members.filter((m) => m.id !== profile.id && !items.some((i) => i.person.id === m.id));
  const colleagues = dir.members.length - 1;

  return (
    <div className="pt-2 max-w-3xl">
      <PageHeader help="messages" icon="comment" tone="mint" title={t("messages.heading")} description={t("messages.sub")} />
      <div className="flex flex-col gap-6">
        <Panel title={t("messages.conversations")}>
          {items.length === 0 ? (
            <div className="text-sm">
              <p className="font-semibold">{t("messages.noConversations")}</p>
              <p className="t-muted">{colleagues > 0 ? t("messages.noConversationsBody") : t("messages.noColleagues")}</p>
            </div>
          ) : (
            <ConversationList items={items} me={profile.id} t={t} locale={locale} />
          )}
        </Panel>
        {others.length > 0 && (
          <Panel title={t("messages.newMessage")} eyebrow={t("messages.startWith")}>
            <ul className="grid sm:grid-cols-2 gap-2">
              {others.map((m) => (
                <li key={m.id}>
                  <Link href={`/messages/${m.id}`} className="press flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-cloud">
                    <Avatar name={m.full_name} src={m.avatar_url} size="md" ring />
                    <span className="min-w-0"><span className="block font-semibold truncate">{m.full_name}</span><span className="block text-xs t-muted truncate">{m.job_title || "—"}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
