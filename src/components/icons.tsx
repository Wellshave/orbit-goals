import {
  Rocket, Flag, Flame, Award, HeartHandshake, TrendingUp, CalendarDays, CheckCircle2, User, Users, Building2,
  Target, Gauge, Trophy, Bell, Settings, Sparkles, Gift, Star, MessageCircle, AtSign, Lock, Share2, Sun, ListChecks,
  Footprints, Bike, BookOpen, GraduationCap, HeartPulse, Repeat, ClipboardCheck, PiggyBank, Palette, Dumbbell, Medal, Timer,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/lib/status";

/** Eén iconenfamilie: afgeronde lucide-iconen in een clay-achtige kleurtegel. */
export const ICONS = {
  rocket: Rocket, flag: Flag, flame: Flame, award: Award, collab: HeartHandshake, trend: TrendingUp, calendar: CalendarDays,
  check: CheckCircle2, person: User, team: Users, company: Building2, goal: Target, kpi: Gauge, trophy: Trophy, bell: Bell,
  settings: Settings, sparkles: Sparkles, gift: Gift, star: Star, comment: MessageCircle, mention: AtSign, lock: Lock, share: Share2,
  today: Sun, checkin: ListChecks,
  run: Footprints, bike: Bike, book: BookOpen, cap: GraduationCap, heart: HeartPulse, repeat: Repeat, project: ClipboardCheck,
  money: PiggyBank, palette: Palette, dumbbell: Dumbbell, medal: Medal, timer: Timer,
} as const;
export type IconName = keyof typeof ICONS;

export const TONE_STYLE: Record<Tone, { bg: string; fg: string; strong: string; hex: string }> = {
  blue: { bg: "bg-sky", fg: "text-blue-deep", strong: "bg-blue", hex: "#5B6CFF" },
  purple: { bg: "bg-lavender", fg: "text-purple-deep", strong: "bg-purple", hex: "#9B72F2" },
  mint: { bg: "bg-mintsoft", fg: "text-mint-deep", strong: "bg-mint", hex: "#48CFAE" },
  yellow: { bg: "bg-butter", fg: "text-yellow-deep", strong: "bg-yellow", hex: "#F6C85F" },
  coral: { bg: "bg-peach", fg: "text-coral-deep", strong: "bg-coral", hex: "#FF7B6B" },
  grey: { bg: "bg-cloud", fg: "text-ink-2", strong: "bg-ink-3", hex: "#98A2B3" },
};

const SIZES = { sm: "size-8 [&>svg]:size-4", md: "size-10 [&>svg]:size-5", lg: "size-14 [&>svg]:size-7 rounded-[18px]", xl: "size-20 [&>svg]:size-10 rounded-[24px]" };

export function ClayIcon({ name, tone = "blue", size = "md", className = "", color, label }: { name: IconName | LucideIcon; tone?: Tone; size?: keyof typeof SIZES; className?: string; color?: string; label?: string }) {
  const Icon = typeof name === "string" ? ICONS[name] : name;
  const t = TONE_STYLE[tone];
  const style = color ? { background: `color-mix(in oklab, ${color} 18%, white)`, color: `color-mix(in oklab, ${color} 78%, #172033)` } : undefined;
  return (
    <span className={`clay shrink-0 ${SIZES[size]} ${color ? "" : `${t.bg} ${t.fg}`} ${className}`} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Icon strokeWidth={2.25} />
    </span>
  );
}

/** Icoon per goaltype; teamdoelen krijgen de teamkleur. */
export function goalIcon(goalType: "personal" | "team" | "company"): { name: IconName; tone: Tone } {
  return goalType === "company" ? { name: "company", tone: "yellow" } : goalType === "team" ? { name: "team", tone: "purple" } : { name: "person", tone: "mint" };
}
