import Link from "next/link";
import { Lock, Users, Building2, Share2 } from "lucide-react";
import type { Goal, Milestone, Profile } from "@/lib/types";
import { AvatarStack, StatusPill } from "@/components/ui";
import { TrajectoryBar } from "@/components/instruments/trajectory-bar";
import { daysLeft, GOAL_TYPE_LABELS } from "@/lib/status";
import { fmtCompact, fmtDate } from "@/lib/format";

const VIS_ICON = { private: Lock, shared: Share2, team: Users, company: Building2 } as const;

export function GoalCard({ goal, milestones, people, teamName, compact = false }: { goal: Goal; milestones: Milestone[]; people: Profile[]; teamName?: string | null; compact?: boolean }) {
  const Vis = VIS_ICON[goal.visibility];
  const left = daysLeft(goal.deadline);
  return (
    <Link href={`/goals/${goal.id}`} className="deck block p-4 hover:border-ice/25 transition-colors group focus-visible:outline-cobalt">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow flex items-center gap-1.5">
            <Vis className="size-3" aria-hidden />
            {GOAL_TYPE_LABELS[goal.goal_type]}
            {teamName ? ` · ${teamName}` : ""} · {goal.category}
          </p>
          <h3 className={`font-display font-semibold mt-1 leading-snug group-hover:text-cobalt-soft transition-colors ${compact ? "text-base" : "text-lg"}`}>{goal.title}</h3>
        </div>
        <StatusPill status={goal.status} short size="xs" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="t-num leading-none">
          <span className={`font-bold ${compact ? "text-xl" : "text-2xl"}`}>{goal.measure === "binary" ? (goal.current_value >= 1 ? "Klaar" : "Open") : fmtCompact(goal.current_value, goal.unit)}</span>
          {goal.measure === "numeric" && <span className="text-muted text-sm"> / {fmtCompact(goal.target_value, goal.unit)}</span>}
        </p>
        <p className="t-num text-xs text-muted text-right">
          {left < 0 ? `${Math.abs(left)} d. over deadline` : left === 0 ? "vandaag" : `nog ${left} d.`}
          <br />
          <span className="text-[0.6875rem]">{fmtDate(goal.deadline)}</span>
        </p>
      </div>
      <div className="mt-2.5">
        <TrajectoryBar goal={goal} milestones={milestones} compact showLabels={false} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <AvatarStack people={people} size="xs" />
        {milestones.length > 0 && (
          <span className="t-num text-[0.6875rem] text-muted">
            {milestones.filter((m) => m.status === "achieved").length}/{milestones.length} milestones
          </span>
        )}
      </div>
    </Link>
  );
}
