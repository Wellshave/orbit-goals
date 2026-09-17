import type { IconName } from "@/components/icons";
import type { Tone } from "@/lib/status";

export interface NavItem { href: string; key: string; icon: IconName; tone: Tone; group: string; }

/** Labels via t(`nav.${key}`), groepen via t(`nav.groups.${group}`). */
export const NAV: NavItem[] = [
  { href: "/dashboard", key: "today", icon: "today", tone: "yellow", group: "overview" },
  { href: "/company", key: "company", icon: "company", tone: "blue", group: "overview" },
  { href: "/teams", key: "teams", icon: "team", tone: "purple", group: "overview" },
  { href: "/goals", key: "goals", icon: "rocket", tone: "coral", group: "work" },
  { href: "/kpis", key: "kpis", icon: "kpi", tone: "blue", group: "work" },
  { href: "/checkin", key: "checkins", icon: "checkin", tone: "mint", group: "work" },
  { href: "/scoreboard", key: "scoreboard", icon: "trophy", tone: "yellow", group: "together" },
  { href: "/people", key: "people", icon: "collab", tone: "purple", group: "together" },
  { href: "/messages", key: "messages", icon: "comment", tone: "mint", group: "together" },
  { href: "/notifications", key: "notifications", icon: "bell", tone: "coral", group: "together" },
  { href: "/settings", key: "settings", icon: "settings", tone: "grey", group: "system" },
];

export const MOBILE_NAV = ["/dashboard", "/goals", "/checkin", "/kpis"];
