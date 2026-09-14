import { AtSign, MessageSquare, Gauge, CalendarClock, Flag, Star, TrendingDown, Award, Target, Mail } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { markAllRead, markNotificationRead } from "@/app/actions/misc";
import { Avatar, EmptyState } from "@/components/ui";
import { fmtRelative } from "@/lib/format";
import type { Notification, NotificationKind } from "@/lib/types";

export const metadata = { title: "Notificaties" };

const ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  mention: AtSign, reply: MessageSquare, kpi_assigned: Gauge, deadline_soon: CalendarClock, milestone_near: Flag,
  milestone_achieved: Star, goal_behind: TrendingDown, recognition: Award, goal_assigned: Target, invite: Mail,
};
const LABEL: Record<NotificationKind, string> = {
  mention: "Vermelding", reply: "Reactie", kpi_assigned: "KPI toegewezen", deadline_soon: "Deadline nadert", milestone_near: "Milestone in zicht",
  milestone_achieved: "Milestone behaald", goal_behind: "Doel loopt achter", recognition: "Erkenning", goal_assigned: "Doel toegewezen", invite: "Uitnodiging",
};

export default async function NotificationsPage() {
  const { supabase, profile } = await getSession();
  const dir = await getDirectory();
  const { data } = await supabase.from("notifications").select("*").eq("recipient_id", profile.id).order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read_at);
  const read = list.filter((n) => n.read_at);

  const Item = ({ n }: { n: Notification }) => {
    const Icon = ICON[n.kind];
    const actor = n.actor_id ? dir.byId.get(n.actor_id) : null;
    return (
      <li>
        <form action={markNotificationRead}>
          <input type="hidden" name="id" value={n.id} />
          <input type="hidden" name="href" value={n.href} />
          <button type="submit" className={`w-full text-left flex items-start gap-3 p-3 rounded-[var(--radius-panel)] hover:bg-ice/5 ${n.read_at ? "opacity-70" : ""}`}>
            {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="sm" /> : <span className="grid place-items-center size-8 rounded-full bg-ink-deep border border-line text-muted shrink-0"><Icon className="size-4" aria-hidden /></span>}
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-mono uppercase tracking-wider text-muted">{LABEL[n.kind]} · {fmtRelative(n.created_at)}</span>
              <span className="block text-sm font-semibold leading-snug mt-0.5">{n.title}</span>
              {n.body && <span className="block text-sm text-ice-dim mt-0.5">{n.body}</span>}
            </span>
            {!n.read_at && <span className="mt-2 size-2 rounded-full bg-coral shrink-0" aria-label="ongelezen" />}
          </button>
        </form>
      </li>
    );
  };

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Inbox" title="Notificaties" description="Vermeldingen, reacties, toewijzingen, deadlines, milestones en doelen die achterlopen." actions={unread.length > 0 ? <form action={markAllRead}><button type="submit" className="text-sm font-semibold text-cobalt-soft hover:underline">Alles als gelezen markeren</button></form> : undefined} />
      {list.length === 0 ? <EmptyState title="Nog geen notificaties" body="Zodra iemand je noemt, je een KPI krijgt of een milestone binnen is, zie je het hier." /> : (
        <>
          {unread.length > 0 && (
            <section className="deck p-2 mb-6" aria-label="Ongelezen"><p className="t-eyebrow px-3 pt-2 pb-1">Ongelezen · {unread.length}</p><ul className="divide-y divide-line">{unread.map((n) => <Item key={n.id} n={n} />)}</ul></section>
          )}
          {read.length > 0 && (
            <section className="deck p-2" aria-label="Gelezen"><p className="t-eyebrow px-3 pt-2 pb-1">Eerder</p><ul className="divide-y divide-line">{read.map((n) => <Item key={n.id} n={n} />)}</ul></section>
          )}
        </>
      )}
    </div>
  );
}
