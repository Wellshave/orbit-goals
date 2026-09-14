"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

export function NotificationBell({ initialUnread, userId }: { initialUnread: number; userId: string }) {
  const [unread, setUnread] = useState(initialUnread);
  const [seenInitial, setSeenInitial] = useState(initialUnread);
  const [pulse, setPulse] = useState(false);
  const router = useRouter();
  const t = useT();
  if (initialUnread !== seenInitial) { setSeenInitial(initialUnread); setUnread(initialUnread); }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Realtime evaluates RLS with the token present at subscribe time, so wait
    // for the user session before joining; otherwise the channel joins as anon
    // and never receives the recipient's notifications.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`notifications:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
          setUnread((n) => n + 1);
          setPulse(true);
          setTimeout(() => setPulse(false), 1100);
          router.refresh();
        })
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Link href="/notifications" className={`press relative grid place-items-center size-11 rounded-full bg-white border border-line shadow-[var(--shadow-press)] text-ink-2 hover:text-ink ${pulse ? "pulse-once" : ""}`} aria-label={unread > 0 ? t("shell.unread", { n: unread }) : t("shell.bell")}>
      <Bell className="size-5" aria-hidden />
      {unread > 0 && <span className="absolute -top-1 -right-1 tnum text-[0.6875rem] font-bold bg-coral text-white rounded-full min-w-5 h-5 px-1.5 grid place-items-center ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
