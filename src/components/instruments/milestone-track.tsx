import type { Goal, Milestone, Reward } from "@/lib/types";
import { fmtCompact, fmtDate } from "@/lib/format";
import { Gift, Check, Flag, Star } from "lucide-react";
import type { Locale, T } from "@/lib/i18n";

/** Milestonekaarten als badges op een rij. */
export function MilestoneBadges({ goal, milestones, rewards = [], t, locale }: { goal: Goal; milestones: Milestone[]; rewards?: Reward[]; t: T; locale: Locale }) {
  if (milestones.length === 0) return null;
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order || a.target_value - b.target_value);
  const nextId = sorted.find((m) => m.status === "pending")?.id;
  return (
    <ol className="flex flex-wrap gap-2.5">
      {sorted.map((m) => {
        const done = m.status === "achieved";
        const isNext = m.id === nextId;
        const reward = rewards.find((r) => r.milestone_id === m.id);
        return (
          <li key={m.id} className={`tile flex items-center gap-3 px-3 py-2.5 ${done ? "soft-mint" : isNext ? "bg-white shadow-[var(--shadow-card)] ring-2 ring-blue/30" : "soft-cloud"}`}>
            <span className={`clay size-9 ${done ? "bg-mint text-white" : m.is_ultimate ? "bg-butter text-yellow-deep" : "bg-white text-ink-3"}`}>{done ? <Check className="size-4" /> : m.is_ultimate ? <Flag className="size-4" /> : <Star className="size-4" />}</span>
            <span className="min-w-0">
              <span className="block font-display font-extrabold text-sm leading-tight">{fmtCompact(m.target_value, goal.unit)}</span>
              <span className="block text-xs t-muted truncate max-w-[10rem]">{done ? t("milestones.behaaldD", { d: fmtDate(m.achieved_at, "d MMM", locale) }) : m.name}</span>
            </span>
            {reward && <Gift className={`size-4 shrink-0 ${reward.granted_at ? "text-mint-deep" : "text-yellow-deep"}`} aria-label={`Reward: ${reward.title}`} />}
          </li>
        );
      })}
    </ol>
  );
}
