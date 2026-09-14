"use client";

import type { Status } from "@/lib/types";
import { STATUS_META, displayStatus, type Tone } from "@/lib/status";
import { useT } from "@/lib/i18n/client";
import { CheckCircle2, Circle, Sparkles, AlertCircle, ArrowUpRight, LifeBuoy } from "lucide-react";

const tones: Record<Tone, string> = {
  grey: "bg-cloud text-ink-2",
  blue: "bg-sky text-blue-deep",
  yellow: "bg-butter text-yellow-deep",
  coral: "bg-peach text-coral-deep",
  mint: "bg-mintsoft text-mint-deep",
  purple: "bg-lavender text-purple-deep",
};
const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  not_started: Circle, on_track: ArrowUpRight, needs_attention: AlertCircle, behind: LifeBuoy, achieved: CheckCircle2, almost: Sparkles,
};

export function statusTone(status: Status) {
  return tones[STATUS_META[status].tone];
}

export function StatusPill({ status, progress, size = "sm" }: { status: Status; progress?: number; size?: "xs" | "sm" }) {
  const t = useT();
  const almost = progress !== undefined && status !== "achieved" && progress >= 0.9;
  const d = progress !== undefined ? displayStatus(t, status, progress) : { label: t(`status.${status}`), tone: STATUS_META[status].tone };
  const Icon = icons[almost ? "almost" : status] ?? Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${tones[d.tone]} ${size === "xs" ? "text-xs px-2 py-0.5" : "text-[0.8125rem] px-2.5 py-1"}`}>
      <Icon className="size-3.5" aria-hidden />
      {d.label}
    </span>
  );
}

export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  const t = useT();
  const m = STATUS_META[status];
  const color: Record<Tone, string> = { grey: "bg-ink-3", blue: "bg-blue", yellow: "bg-yellow", coral: "bg-coral", mint: "bg-mint", purple: "bg-purple" };
  return <span className={`inline-block size-2.5 rounded-full ${color[m.tone]} ${className}`} aria-label={t(`status.${status}`)} role="img" />;
}

export function Chip({ children, tone = "grey", className = "" }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1 ${tones[tone]} ${className}`}>{children}</span>;
}
