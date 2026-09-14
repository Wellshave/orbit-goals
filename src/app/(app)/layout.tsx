import { Suspense } from "react";
import { getSession } from "@/lib/data/session";
import { Rail, MobileNav } from "@/components/shell/rail";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, org, user } = await getSession();

  // Herinneringen (deadlines, milestones in zicht) bijwerken en ongelezen tellen.
  await supabase.rpc("refresh_reminders");
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  const unread = count ?? 0;

  return (
    <div className="flex min-h-dvh">
      <Rail profile={profile} productName={org.product_name} unread={unread} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 lg:h-16 flex items-center justify-between gap-3 px-4 lg:px-8 border-b border-line bg-ink/85 backdrop-blur">
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2 font-display font-bold">
            <OrbitMark className="size-6" /> {org.product_name}
          </Link>
          <p className="hidden lg:block text-sm text-muted">
            <span className="text-ice-dim font-semibold">{org.name}</span> · performance cockpit
          </p>
          <div className="flex items-center gap-2">
            <Suspense fallback={null}>
              <NotificationBell initialUnread={unread} userId={user.id} />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
      <MobileNav unread={unread} />
    </div>
  );
}
