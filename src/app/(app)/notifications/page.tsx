import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { markAllRead, markNotificationRead } from "@/app/actions/misc";
import { Avatar, EmptyState } from "@/components/ui";
import { ClayIcon, type IconName } from "@/components/icons";
import { fmtRelative } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { Notification, NotificationKind } from "@/lib/types";
import type { Tone } from "@/lib/status";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("notifications.title") };
}

const META: Record<NotificationKind, { icon: IconName; tone: Tone }> = {
  mention: { icon: "mention", tone: "blue" }, reply: { icon: "comment", tone: "blue" }, kpi_assigned: { icon: "kpi", tone: "purple" },
  deadline_soon: { icon: "calendar", tone: "yellow" }, milestone_near: { icon: "flag", tone: "yellow" }, milestone_achieved: { icon: "star", tone: "mint" },
  goal_behind: { icon: "rocket", tone: "coral" }, recognition: { icon: "award", tone: "purple" }, goal_assigned: { icon: "goal", tone: "purple" }, invite: { icon: "collab", tone: "mint" },
};

export default async function NotificationsPage() {
  const { supabase, profile, locale, t } = await getSession();
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
              <span className="block text-xs font-semibold t-muted">{t(`notifications.kinds.${n.kind}`)} · {fmtRelative(n.created_at, locale)}</span>
              <span className="block font-bold leading-snug mt-0.5">{n.title}</span>
              {n.body && <span className="block text-sm text-ink-2 mt-0.5">{n.body}</span>}
            </span>
            {!n.read_at && <span className="mt-2 size-2.5 rounded-full bg-coral shrink-0" aria-label={t("notifications.unread")} />}
          </button>
        </form>
      </li>
    );
  };

  return (
    <div className="max-w-2xl pt-2">
      <PageHeader help="notifications" icon="bell" tone="coral" eyebrow={t("notifications.eyebrow")} title={unread.length ? (unread.length === 1 ? t("notifications.newOne") : t("notifications.newMany", { n: unread.length })) : t("notifications.caughtUp")} description={t("notifications.sub")} actions={unread.length > 0 ? <form action={markAllRead}><button type="submit" className="text-sm font-semibold text-blue-deep hover:underline">{t("notifications.markAll")}</button></form> : undefined} />
      {list.length === 0 ? <EmptyState icon="bell" tone="coral" title={t("notifications.none")} body={t("notifications.noneBody")} /> : (
        <>
          {unread.length > 0 && <section className="card p-2 mb-6"><ul className="divide-y divide-line">{unread.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
          {read.length > 0 && <section className="card p-2"><p className="t-label px-3 pt-2 pb-1">{t("notifications.earlier")}</p><ul className="divide-y divide-line">{read.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
        </>
      )}
    </div>
  );
}
