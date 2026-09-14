"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV, MOBILE_NAV } from "./nav";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { ClayIcon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/status";

function readRail() {
  try { return localStorage.getItem("orbit.rail") === "collapsed"; } catch { return false; }
}
function subscribeRail(cb: () => void) {
  window.addEventListener("orbit:rail", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("orbit:rail", cb); window.removeEventListener("storage", cb); };
}

export function Rail({ profile, productName, unread }: { profile: Profile; productName: string; unread: number }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeRail, readRail, () => false);
  function toggle() {
    try { localStorage.setItem("orbit.rail", collapsed ? "open" : "collapsed"); } catch {}
    window.dispatchEvent(new Event("orbit:rail"));
  }
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <aside className={`hidden lg:flex shrink-0 flex-col sticky top-0 h-dvh bg-white/70 backdrop-blur border-r border-line transition-[width] duration-200 ${collapsed ? "w-[84px]" : "w-[248px]"}`}>
      <div className={`h-[72px] flex items-center gap-2.5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <OrbitMark className="size-8" />
        {!collapsed && <span className="font-display font-extrabold text-lg">{productName}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Hoofdnavigatie">
        {groups.map((g) => (
          <div key={g} className="mb-6">
            {!collapsed && <p className="t-label px-3 mb-2">{g}</p>}
            <ul className="flex flex-col gap-1">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={active ? "page" : undefined} title={collapsed ? n.label : undefined} className={`press flex items-center gap-3 rounded-2xl text-[0.9375rem] font-semibold ${collapsed ? "justify-center p-2" : "px-2.5 py-2"} ${active ? "bg-white shadow-[var(--shadow-card)] text-ink" : "text-ink-2 hover:text-ink hover:bg-white/70"}`}>
                      <ClayIcon name={n.icon} tone={n.tone} size="sm" className={active ? "" : "opacity-90"} />
                      {!collapsed && <span className="flex-1">{n.label}</span>}
                      {n.href === "/notifications" && unread > 0 && (
                        <span className={`tnum text-[0.6875rem] font-bold bg-coral text-white rounded-full px-1.5 min-w-5 h-5 grid place-items-center ${collapsed ? "absolute translate-x-4 -translate-y-3" : ""}`}>{unread > 99 ? "99+" : unread}</span>
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
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          <Link href={`/people/${profile.id}`} className="shrink-0 rounded-full" aria-label="Mijn profiel">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="md" ring />
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-xs t-muted truncate">{ROLE_LABELS[profile.role]}{profile.job_title ? ` · ${profile.job_title}` : ""}</p>
            </div>
          )}
          <form action={signOut}>
            <button type="submit" className="press p-2 rounded-full text-ink-2 hover:text-ink hover:bg-cloud" aria-label="Uitloggen" title="Uitloggen"><LogOut className="size-4" /></button>
          </form>
        </div>
        <button type="button" onClick={toggle} className="press mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-ink-2 hover:text-ink py-1.5 rounded-full hover:bg-cloud" aria-pressed={collapsed} aria-label={collapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Inklappen</>}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => MOBILE_NAV.includes(n.href));
  const moreActive = !items.some((n) => pathname.startsWith(n.href));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Navigatie">
      <ul className="grid grid-cols-5">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const isCheckin = n.href === "/checkin";
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={`press flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-semibold ${active ? "text-ink" : "text-ink-2"}`}>
                {isCheckin ? (
                  <span className="grid place-items-center size-12 -mt-5 rounded-full bg-mint text-ink shadow-[0_10px_24px_-8px_rgba(72,207,174,0.9)]"><ClayIcon name="checkin" tone="mint" size="sm" className="bg-transparent shadow-none text-ink" /></span>
                ) : (
                  <ClayIcon name={n.icon} tone={n.tone} size="sm" className={active ? "" : "opacity-70"} />
                )}
                {n.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/more" className={`press relative flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-semibold ${moreActive ? "text-ink" : "text-ink-2"}`}>
            <span className="clay size-8 bg-cloud text-ink-2"><MoreHorizontal className="size-4" aria-hidden /></span>
            Meer
            {unread > 0 && <span className="absolute top-1.5 right-5 size-2 rounded-full bg-coral" aria-label={`${unread} ongelezen`} />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
