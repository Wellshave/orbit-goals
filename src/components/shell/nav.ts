import type { IconName } from "@/components/icons";
import type { Tone } from "@/lib/status";

export interface NavItem { href: string; label: string; icon: IconName; tone: Tone; group: string; }

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Vandaag", icon: "today", tone: "yellow", group: "Overzicht" },
  { href: "/company", label: "Bedrijf", icon: "company", tone: "blue", group: "Overzicht" },
  { href: "/teams", label: "Teams", icon: "team", tone: "purple", group: "Overzicht" },
  { href: "/goals", label: "Doelen", icon: "rocket", tone: "coral", group: "Werk" },
  { href: "/kpis", label: "KPI's", icon: "kpi", tone: "blue", group: "Werk" },
  { href: "/checkin", label: "Check-ins", icon: "checkin", tone: "mint", group: "Werk" },
  { href: "/scoreboard", label: "Scorebord", icon: "trophy", tone: "yellow", group: "Samen" },
  { href: "/people", label: "Mensen", icon: "collab", tone: "purple", group: "Samen" },
  { href: "/notifications", label: "Meldingen", icon: "bell", tone: "coral", group: "Samen" },
  { href: "/settings", label: "Instellingen", icon: "settings", tone: "grey", group: "Systeem" },
];

export const MOBILE_NAV = ["/dashboard", "/goals", "/checkin", "/kpis"];
