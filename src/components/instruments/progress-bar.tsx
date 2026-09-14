"use client";

import type { Goal, Milestone } from "@/lib/types";
import { goalExpected, goalProgress, milestonePosition } from "@/lib/status";
import { clamp } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

/** Gevulde voortgangsbalk met milestone-stippen en een zacht 'verwacht'-merkteken. */
export function ProgressBar({ goal, milestones = [], height = "md", accent }: { goal: Goal; milestones?: Milestone[]; height?: "sm" | "md" | "lg"; accent?: string }) {
  const t = useT();
  const p = clamp(goalProgress(goal), 0, 1);
  const e = goalExpected(goal);
  const done = goal.status === "achieved";
  const color = done ? "linear-gradient(90deg,#48CFAE,#7FE0C8)" : goal.status === "behind" ? "linear-gradient(90deg,#FF7B6B,#FFA08F)" : `linear-gradient(90deg,${accent ?? "#5B6CFF"},#9B72F2)`;
  const h = { sm: "h-2.5", md: "h-3.5", lg: "h-5" }[height];
  return (
    <div className={`relative w-full ${h} rounded-full bg-cloud overflow-visible`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={t("path.progressLabel", { p: Math.round(p * 100) })}>
      <div className={`absolute inset-y-0 left-0 rounded-full ${h}`} style={{ width: `${Math.max(p * 100, p > 0 ? 4 : 0)}%`, background: color, transition: "width 800ms cubic-bezier(0.22,1,0.36,1)" }} />
      {!done && e > 0 && e < 1 && (
        <span aria-hidden title={t("path.expected")} className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink/25" style={{ left: `${e * 100}%` }} />
      )}
      {milestones.map((m) => (
        <span key={m.id} aria-hidden title={m.name} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full ring-2 ring-white ${m.status === "achieved" ? "bg-mint" : "bg-white border-2 border-ink/30"}`} style={{ left: `${milestonePosition(goal, m.target_value) * 100}%` }} />
      ))}
    </div>
  );
}

/** Eenvoudige balk voor een ratio (KPI). */
export function RatioBar({ ratio, tone = "blue" }: { ratio: number | null; tone?: "blue" | "mint" | "yellow" | "coral" | "grey" | "purple" }) {
  const v = clamp(ratio ?? 0, 0, 1);
  const bg = { blue: "#5B6CFF", mint: "#48CFAE", yellow: "#F6C85F", coral: "#FF7B6B", grey: "#98A2B3", purple: "#9B72F2" }[tone];
  return (
    <div className="h-2.5 rounded-full bg-cloud overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: bg, transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}
