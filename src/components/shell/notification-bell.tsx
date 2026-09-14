"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ initialUnread, userId }: { initialUnread: number; userId: string }) {
  const [unread, setUnread] = useState(initialUnread);
  const [seenInitial, setSeenInitial] = useState(initialUnread);
  const [pulse, setPulse] = useState(false);
  const router = useRouter();
  if (initialUnread !== seenInitial) { setSeenInitial(initialUnread); setUnread(initialUnread); }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
        setUnread((n) => n + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 1100);
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, router]);

  return (
    <Link href="/notifications" className={`press relative grid place-items-center size-11 rounded-full bg-white border border-line shadow-[var(--shadow-press)] text-ink-2 hover:text-ink ${pulse ? "pulse-once" : ""}`} aria-label={unread > 0 ? `${unread} ongelezen meldingen` : "Meldingen"}>
      <Bell className="size-5" aria-hidden />
      {unread > 0 && <span className="absolute -top-1 -right-1 tnum text-[0.6875rem] font-bold bg-coral text-white rounded-full min-w-5 h-5 px-1.5 grid place-items-center ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
