"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronsRight, LogOut, MoreHorizontal, PanelLeftClose } from "lucide-react";
import { NAV, MOBILE_NAV } from "./nav";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { ClayIcon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import { LanguageToggle } from "./language-toggle";
import { HelpIndex } from "@/components/help/help-index";

function readRail() {
  try { return localStorage.getItem("orbit.rail") === "collapsed"; } catch { return false; }
}
function subscribeRail(cb: () => void) {
  window.addEventListener("orbit:rail", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("orbit:rail", cb); window.removeEventListener("storage", cb); };
}

// Haal de volledige pagina al op bij hover/touch (experimental.dynamicOnHover); de publieke Link-types kennen de prop nog niet.
const hoverPrefetch = { unstable_dynamicOnHover: true } as object;

export function Rail({ profile, productName, unread, unreadDm = 0 }: { profile: Profile; productName: string; unread: number; unreadDm?: number }) {
  const pathname = usePathname();
  const t = useT();
  const collapsed = useSyncExternalStore(subscribeRail, readRail, () => false);
  function toggle() {
    try { localStorage.setItem("orbit.rail", collapsed ? "open" : "collapsed"); } catch {}
    window.dispatchEvent(new Event("orbit:rail"));
  }
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <aside className={`hidden lg:flex shrink-0 flex-col sticky top-0 h-dvh bg-white/70 backdrop-blur border-r border-line transition-[width] duration-200 ${collapsed ? "w-[84px]" : "w-[248px]"}`}>
      <div className={`h-[72px] flex items-center gap-2.5 ${collapsed ? "justify-center px-2" : "pl-5 pr-3"}`}>
        <OrbitMark className="size-8" />
        {!collapsed && <span className="font-display font-extrabold text-lg flex-1 truncate">{productName}</span>}
        {!collapsed && (
          <button type="button" onClick={toggle} className="press p-2 rounded-full text-ink-2 hover:text-ink hover:bg-cloud" aria-pressed={false} aria-label={t("shell.collapseAria")} title={t("shell.collapseAria")}><PanelLeftClose className="size-4" aria-hidden /></button>
        )}
      </div>
      {collapsed && (
        <div className="px-3 pb-3">
          <button type="button" onClick={toggle} className="press w-full grid place-items-center py-2 rounded-2xl bg-white border border-line shadow-[var(--shadow-press)] text-blue-deep hover:bg-blue hover:text-white" aria-pressed aria-label={t("shell.expand")} title={t("shell.expand")}><ChevronsRight className="size-5" aria-hidden /></button>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t("shell.mainNav")}>
        {groups.map((g) => (
          <div key={g} className="mb-6">
            {!collapsed && <p className="t-label px-3 mb-2">{t(`nav.groups.${g}`)}</p>}
            <ul className="flex flex-col gap-1">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <li key={n.href}>
                    <Link href={n.href} {...hoverPrefetch} aria-current={active ? "page" : undefined} title={collapsed ? t(`nav.${n.key}`) : undefined} className={`press flex items-center gap-3 rounded-2xl text-[0.9375rem] font-semibold ${collapsed ? "justify-center p-2" : "px-2.5 py-2"} ${active ? "bg-white shadow-[var(--shadow-card)] text-ink" : "text-ink-2 hover:text-ink hover:bg-white/70"}`}>
                      <ClayIcon name={n.icon} tone={n.tone} size="sm" className={active ? "" : "opacity-90"} />
                      {!collapsed && <span className="flex-1">{t(`nav.${n.key}`)}</span>}
                      {(() => {
                        const badge = n.href === "/notifications" ? unread : n.href === "/messages" ? unreadDm : 0;
                        if (badge <= 0) return null;
                        return <span className={`tnum text-[0.6875rem] font-bold bg-coral text-white rounded-full px-1.5 min-w-5 h-5 grid place-items-center ${collapsed ? "absolute translate-x-4 -translate-y-3" : ""}`} aria-label={n.href === "/messages" ? t("shell.unreadMessages", { n: badge }) : t("shell.unread", { n: badge })}>{badge > 99 ? "99+" : badge}</span>;
                      })()}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-line">
        <div className="mb-2"><HelpIndex collapsed={collapsed} /></div>
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          <Link href={`/people/${profile.id}`} className="shrink-0 rounded-full" aria-label={t("shell.myProfile")}>
            <Avatar name={profile.full_name} src={profile.avatar_url} size="md" ring />
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-xs t-muted truncate">{t(`role.${profile.role}`)}{profile.job_title ? ` · ${profile.job_title}` : ""}</p>
            </div>
          )}
        </div>
        {/* Uitloggen staat bewust alleen in de uitgeklapte balk, met tekst: in de smalle balk leek het icoon op "uitklappen". */}
        {!collapsed && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <LanguageToggle compact />
            <form action={signOut}>
              <button type="submit" className="press inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-coral-deep px-2.5 py-1.5 rounded-full hover:bg-cloud"><LogOut className="size-3.5" aria-hidden /> {t("shell.logout")}</button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const t = useT();
  const items = NAV.filter((n) => MOBILE_NAV.includes(n.href));
  const moreActive = !items.some((n) => pathname.startsWith(n.href));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label={t("shell.nav")}>
      <ul className="grid grid-cols-5">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const isCheckin = n.href === "/checkin";
          return (
            <li key={n.href}>
              <Link href={n.href} {...hoverPrefetch} aria-current={active ? "page" : undefined} className={`press flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-semibold ${active ? "text-ink" : "text-ink-2"}`}>
                {isCheckin ? (
                  <span className="grid place-items-center size-12 -mt-5 rounded-full bg-mint text-ink shadow-[0_10px_24px_-8px_rgba(72,207,174,0.9)]"><ClayIcon name="checkin" tone="mint" size="sm" className="bg-transparent shadow-none text-ink" /></span>
                ) : (
                  <ClayIcon name={n.icon} tone={n.tone} size="sm" className={active ? "" : "opacity-70"} />
                )}
                {t(`nav.${n.key}`)}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/more" className={`press relative flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-semibold ${moreActive ? "text-ink" : "text-ink-2"}`}>
            <span className="clay size-8 bg-cloud text-ink-2"><MoreHorizontal className="size-4" aria-hidden /></span>
            {t("nav.more")}
            {unread > 0 && <span className="absolute top-1.5 right-5 size-2 rounded-full bg-coral" aria-label={t("shell.unread", { n: unread })} />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
