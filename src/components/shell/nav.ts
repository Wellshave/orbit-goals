import {
  LayoutDashboard, Building2, Users, Target, Gauge, CheckSquare, Trophy, Bell, Settings, UsersRound, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; group: string; }

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Mijn dashboard", icon: LayoutDashboard, group: "Overzicht" },
  { href: "/company", label: "Company", icon: Building2, group: "Overzicht" },
  { href: "/teams", label: "Teams", icon: UsersRound, group: "Overzicht" },
  { href: "/goals", label: "Doelen", icon: Target, group: "Werk" },
  { href: "/kpis", label: "KPI's", icon: Gauge, group: "Werk" },
  { href: "/checkin", label: "Check-in", icon: CheckSquare, group: "Werk" },
  { href: "/scoreboard", label: "Scorebord", icon: Trophy, group: "Mensen" },
  { href: "/people", label: "Teamleden", icon: Users, group: "Mensen" },
  { href: "/notifications", label: "Notificaties", icon: Bell, group: "Mensen" },
  { href: "/settings", label: "Instellingen", icon: Settings, group: "Systeem" },
];

export const MOBILE_NAV = ["/dashboard", "/goals", "/checkin", "/kpis"];
