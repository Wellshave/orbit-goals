import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { markAllRead, markNotificationRead } from "@/app/actions/misc";
import { Avatar, EmptyState } from "@/components/ui";
import { ClayIcon, type IconName } from "@/components/icons";
import { fmtRelative } from "@/lib/format";
import type { Notification, NotificationKind } from "@/lib/types";
import type { Tone } from "@/lib/status";

export const metadata = { title: "Meldingen" };

const META: Record<NotificationKind, { icon: IconName; tone: Tone; label: string }> = {
  mention: { icon: "mention", tone: "blue", label: "Vermelding" }, reply: { icon: "comment", tone: "blue", label: "Reactie" }, kpi_assigned: { icon: "kpi", tone: "purple", label: "KPI toegewezen" },
  deadline_soon: { icon: "calendar", tone: "yellow", label: "Deadline nadert" }, milestone_near: { icon: "flag", tone: "yellow", label: "Milestone in zicht" }, milestone_achieved: { icon: "star", tone: "mint", label: "Milestone behaald" },
  goal_behind: { icon: "rocket", tone: "coral", label: "Doel loopt achter" }, recognition: { icon: "award", tone: "purple", label: "Waardering" }, goal_assigned: { icon: "goal", tone: "purple", label: "Doel toegewezen" }, invite: { icon: "collab", tone: "mint", label: "Uitnodiging" },
};

export default async function NotificationsPage() {
  const { supabase, profile } = await getSession();
  const dir = await getDirectory();
  const { data } = await supabase.from("notifications").select("*").eq("recipient_id", profile.id).order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read_at);
  const read = list.filter((n) => n.read_at);

  const Item = ({ n }: { n: Notification }) => {
    const m = META[n.kind];
    const actor = n.actor_id ? dir.byId.get(n.actor_id) : null;
    return (
      <li>
        <form action={markNotificationRead}>
          <input type="hidden" name="id" value={n.id} /><input type="hidden" name="href" value={n.href} />
          <button type="submit" className={`press w-full text-left flex items-start gap-3 p-3 rounded-2xl hover:bg-cloud ${n.read_at ? "opacity-70" : ""}`}>
            {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="md" ring /> : <ClayIcon name={m.icon} tone={m.tone} size="md" />}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold t-muted">{m.label} · {fmtRelative(n.created_at)}</span>
              <span className="block font-bold leading-snug mt-0.5">{n.title}</span>
              {n.body && <span className="block text-sm text-ink-2 mt-0.5">{n.body}</span>}
            </span>
            {!n.read_at && <span className="mt-2 size-2.5 rounded-full bg-coral shrink-0" aria-label="ongelezen" />}
          </button>
        </form>
      </li>
    );
  };

  return (
    <div className="max-w-2xl pt-2">
      <PageHeader help="notifications" icon="bell" tone="coral" eyebrow="Inbox" title={unread.length ? `${unread.length} nieuwe ${unread.length === 1 ? "melding" : "meldingen"}` : "Je bent helemaal bij"} description="Vermeldingen, reacties, toewijzingen, deadlines, milestones en waardering." actions={unread.length > 0 ? <form action={markAllRead}><button type="submit" className="text-sm font-semibold text-blue-deep hover:underline">Alles als gelezen markeren</button></form> : undefined} />
      {list.length === 0 ? <EmptyState icon="bell" tone="coral" title="Nog geen meldingen" body="Zodra iemand je noemt, je een KPI krijgt of een milestone binnen is, zie je het hier." /> : (
        <>
          {unread.length > 0 && <section className="card p-2 mb-6" aria-label="Ongelezen"><ul className="divide-y divide-line">{unread.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
          {read.length > 0 && <section className="card p-2" aria-label="Eerder"><p className="t-label px-3 pt-2 pb-1">Eerder</p><ul className="divide-y divide-line">{read.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
        </>
      )}
    </div>
  );
}
