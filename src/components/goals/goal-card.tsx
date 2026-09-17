"use client";

import Link from "next/link";
import type { Goal, Milestone, Profile, Team } from "@/lib/types";
import { AvatarStack, StatusPill } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { goalVisual } from "@/lib/goals/formats";
import { ProgressBar } from "@/components/instruments/progress-bar";
import { goalProgress } from "@/lib/status";
import { explainMilestone, nextMilestone, progressLabel } from "@/lib/explain";
import { fmtDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";

export function GoalCard({ goal, milestones, people, team, owner, compact = false, action = "open" }: { goal: Goal; milestones: Milestone[]; people: Profile[]; team?: Team | null; owner?: Profile | null; compact?: boolean; action?: "open" | "update" }) {
  const t = useT();
  const locale = useLocale();
  const icon = goalVisual(goal);
  const next = nextMilestone(goal, milestones);
  const ms = explainMilestone(t, goal, next);
  const who = goal.goal_type === "team" && team ? team.name : goal.goal_type === "company" ? t("goalCard.wholeCompany") : owner?.full_name ?? "";
  const done = goal.status === "achieved";
  return (
    <article className={`card hover-lift ${compact ? "p-4" : "p-5"} flex flex-col gap-3`} data-tour="goal-card">
      <div className="flex items-start gap-3">
        <ClayIcon name={icon.name} tone={icon.tone} size={compact ? "sm" : "md"} color={goal.goal_type === "team" ? team?.color : undefined} />
        <div className="min-w-0 flex-1">
          <h3 className={`font-display font-extrabold leading-snug ${compact ? "text-[0.9375rem]" : "text-lg"}`}><Link href={`/goals/${goal.id}`} className="hover:text-blue-deep">{goal.title}</Link></h3>
          <p className="text-xs t-muted mt-0.5 truncate">{who}{goal.deadline ? ` · ${t("goalCard.untilD", { d: fmtDate(goal.deadline, "d MMM", locale) })}` : ""}</p>
        </div>
        <StatusPill status={goal.status} progress={goalProgress(goal)} size="xs" />
      </div>
      <div>
        <p className="font-display font-extrabold text-xl leading-none">{progressLabel(t, goal)}</p>
        <div className="mt-2.5"><ProgressBar goal={goal} milestones={milestones} height={compact ? "sm" : "md"} accent={goal.goal_type === "team" ? team?.color : undefined} /></div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs t-muted truncate">{done ? t("goalCard.achieved") : ms ?? t("goalCard.underway", { p: Math.round(goalProgress(goal) * 100) })}</p>
        <AvatarStack people={people} size="xs" max={3} />
      </div>
      {!compact && (
        <Link href={action === "update" && !done ? `/goals/${goal.id}#voortgang` : `/goals/${goal.id}`} className="press mt-1 inline-flex items-center justify-center rounded-full bg-sky text-blue-deep font-semibold text-sm py-2 hover:bg-blue hover:text-white">
          {done ? t("goalCard.viewGoal") : action === "update" ? t("goalCard.updateProgress") : t("goalCard.openGoal")}
        </Link>
      )}
    </article>
  );
}

export function GoalRow({ goal, milestones, team }: { goal: Goal; milestones: Milestone[]; team?: Team | null }) {
  const t = useT();
  const icon = goalVisual(goal);
  return (
    <Link href={`/goals/${goal.id}`} className="press flex items-center gap-3 rounded-2xl p-3 hover:bg-cloud">
      <ClayIcon name={icon.name} tone={icon.tone} size="sm" color={goal.goal_type === "team" ? team?.color : undefined} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm truncate">{goal.title}</span>
        <span className="block text-xs t-muted truncate">{progressLabel(t, goal)} · {explainMilestone(t, goal, nextMilestone(goal, milestones)) ?? t("goalCard.noMilestones")}</span>
      </span>
      <StatusPill status={goal.status} progress={goalProgress(goal)} size="xs" />
    </Link>
  );
}
