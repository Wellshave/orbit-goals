import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/data/session";
import { Rail, MobileNav } from "@/components/shell/rail";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { Avatar } from "@/components/ui";
import { TourPlayer } from "@/components/help/tour-player";
import { I18nProvider } from "@/lib/i18n/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, org, user, locale, t } = await getSession();
  await supabase.rpc("refresh_reminders");
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null);
  const unread = count ?? 0;
  const { count: dmCount } = await supabase.from("direct_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null);
  const unreadDm = dmCount ?? 0;

  return (
    <I18nProvider locale={locale}>
    <div className="flex min-h-dvh">
      <Rail profile={profile} productName={org.product_name} unread={unread} unreadDm={unreadDm} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 lg:h-[72px] flex items-center justify-between gap-3 px-4 lg:px-10 bg-canvas/85 backdrop-blur">
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2 font-display font-extrabold text-lg"><OrbitMark className="size-7" /> {org.product_name}</Link>
          <p className="hidden lg:block text-sm t-muted"><span className="font-semibold text-ink">{org.name}</span> · {t("shell.tagline")}</p>
          <div className="flex items-center gap-3">
            <span data-tour="bell"><Suspense fallback={null}><NotificationBell initialUnread={unread} userId={user.id} /></Suspense></span>
            <Link href={`/people/${profile.id}`} className="lg:hidden rounded-full" aria-label={t("shell.myProfile")}><Avatar name={profile.full_name} src={profile.avatar_url} size="sm" ring /></Link>
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-10 pb-28 lg:pb-14 pt-2 max-w-[1280px] w-full mx-auto">{children}</main>
      </div>
      <MobileNav unread={unread + unreadDm} />
      <TourPlayer />
    </div>
    </I18nProvider>
  );
}
