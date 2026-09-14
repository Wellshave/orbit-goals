"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";
import { NAV, MOBILE_NAV } from "./nav";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { Avatar } from "@/components/ui";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/status";

export function Rail({ profile, productName, unread }: { profile: Profile; productName: string; unread: number }) {
  const pathname = usePathname();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <aside className="hidden lg:flex w-[236px] shrink-0 flex-col border-r border-line bg-ink-deep/40 sticky top-0 h-dvh">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-line">
        <OrbitMark className="size-7" />
        <span className="font-display font-bold tracking-tight">{productName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Hoofdnavigatie">
        {groups.map((g) => (
          <div key={g} className="mb-5">
            <p className="t-eyebrow px-2 mb-1.5">{g}</p>
            <ul className="flex flex-col gap-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                const Icon = n.icon;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-sm font-medium transition-colors ${
                        active ? "bg-cobalt/12 text-ice" : "text-ice-dim hover:text-ice hover:bg-ice/5"
                      }`}
                    >
                      {active && <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cobalt" />}
                      <Icon className={`size-4 ${active ? "text-cobalt-soft" : "text-muted group-hover:text-ice-dim"}`} aria-hidden />
                      <span className="flex-1">{n.label}</span>
                      {n.href === "/notifications" && unread > 0 && (
                        <span className="t-num text-[0.6875rem] font-semibold bg-coral text-white rounded-full px-1.5 min-w-5 text-center">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-2.5 px-1.5">
          <Link href={`/people/${profile.id}`} className="shrink-0 rounded-full" aria-label="Mijn profiel">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{profile.full_name}</p>
            <p className="text-[0.6875rem] text-muted truncate">{ROLE_LABELS[profile.role]}{profile.job_title ? ` · ${profile.job_title}` : ""}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="p-1.5 rounded text-muted hover:text-ice hover:bg-ice/5" aria-label="Uitloggen" title="Uitloggen">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => MOBILE_NAV.includes(n.href));
  const moreActive = !items.some((n) => pathname.startsWith(n.href));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-deep/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Navigatie">
      <ul className="grid grid-cols-5">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          const isCheckin = n.href === "/checkin";
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2 text-[0.625rem] font-semibold ${active ? "text-ice" : "text-muted"}`}>
                <span className={`grid place-items-center size-8 rounded-full ${isCheckin ? "bg-cobalt text-white -mt-4 size-11 shadow-[0_8px_20px_-8px_rgba(73,108,255,0.9)]" : active ? "bg-cobalt/15 text-cobalt-soft" : ""}`}>
                  <Icon className={isCheckin ? "size-5" : "size-4"} aria-hidden />
                </span>
                {n.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/more" aria-current={moreActive && pathname === "/more" ? "page" : undefined} className={`relative flex flex-col items-center gap-1 py-2 text-[0.625rem] font-semibold ${moreActive ? "text-ice" : "text-muted"}`}>
            <span className={`grid place-items-center size-8 rounded-full ${moreActive ? "bg-cobalt/15 text-cobalt-soft" : ""}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </span>
            Meer
            {unread > 0 && <span className="absolute top-1.5 right-4 size-2 rounded-full bg-coral" aria-label={`${unread} ongelezen`} />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
