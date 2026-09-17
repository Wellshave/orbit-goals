import Link from "next/link";
import { Avatar } from "@/components/ui";
import { fmtRelative } from "@/lib/format";
import type { DirectMessage, Profile } from "@/lib/types";
import type { Locale, T as TFn } from "@/lib/i18n";

export interface ConversationItem { person: Profile; last: DirectMessage; unread: number; }

export function ConversationList({ items, activeId, me, t, locale }: { items: ConversationItem[]; activeId?: string; me: string; t: TFn; locale: Locale }) {
  if (items.length === 0) return <p className="text-sm t-muted px-1">{t("messages.noConversations")}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ person, last, unread }) => {
        const active = person.id === activeId;
        return (
          <li key={person.id}>
            <Link href={`/messages/${person.id}`} aria-current={active ? "page" : undefined} className={`press flex items-center gap-3 rounded-2xl px-3 py-2.5 ${active ? "bg-white shadow-[var(--shadow-card)]" : "hover:bg-white/70"}`}>
              <Avatar name={person.full_name} src={person.avatar_url} size="md" ring />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${unread > 0 ? "font-extrabold" : "font-semibold"}`}>{person.full_name}</span>
                  <span className="text-xs t-muted shrink-0">{fmtRelative(last.created_at, locale)}</span>
                </span>
                <span className={`block text-sm truncate ${unread > 0 ? "text-ink font-semibold" : "t-muted"}`}>{last.sender_id === me ? `${t("messages.you")}: ` : ""}{last.body}</span>
              </span>
              {unread > 0 && <span className="tnum text-[0.6875rem] font-bold bg-coral text-white rounded-full px-1.5 min-w-5 h-5 grid place-items-center" aria-label={t("messages.unreadN", { n: unread })}>{unread > 99 ? "99+" : unread}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
