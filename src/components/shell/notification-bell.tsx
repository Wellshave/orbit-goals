"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ initialUnread, userId }: { initialUnread: number; userId: string }) {
  const [unread, setUnread] = useState(initialUnread);
  const [pulse, setPulse] = useState(false);
  const router = useRouter();

  const [seenInitial, setSeenInitial] = useState(initialUnread);
  if (initialUnread !== seenInitial) {
    setSeenInitial(initialUnread);
    setUnread(initialUnread);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
        setUnread((n) => n + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Link
      href="/notifications"
      className={`relative grid place-items-center size-9 rounded-full border border-line-strong bg-midnight-2 text-ice-dim hover:text-ice hover:border-ice/30 ${pulse ? "pulse-once" : ""}`}
      aria-label={unread > 0 ? `${unread} ongelezen notificaties` : "Notificaties"}
    >
      <Bell className="size-4" aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 t-num text-[0.625rem] font-bold bg-coral text-white rounded-full min-w-4 h-4 px-1 grid place-items-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
