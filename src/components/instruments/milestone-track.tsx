import type { Goal, Milestone, Reward } from "@/lib/types";
import { fmtCompact, fmtDate } from "@/lib/format";
import { Gift, Check, Star } from "lucide-react";

/** Segmenten per milestone: elke stap een segment, met reward-indicatie. */
export function MilestoneTrack({ goal, milestones, rewards = [], onSelect, selectedId }: { goal: Goal; milestones: Milestone[]; rewards?: Reward[]; onSelect?: (m: Milestone) => void; selectedId?: string | null }) {
  if (milestones.length === 0) return null;
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order || a.target_value - b.target_value);
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sorted.length}, minmax(0, 1fr))` }}>
      {sorted.map((m, i) => {
        const done = m.status === "achieved";
        const asc = goal.target_value >= goal.start_value;
        const prevTarget = i === 0 ? goal.start_value : sorted[i - 1].target_value;
        const segLen = Math.abs(m.target_value - prevTarget) || 1;
        const segDone = asc ? (goal.current_value - prevTarget) / segLen : (prevTarget - goal.current_value) / segLen;
        const fill = done ? 1 : Math.min(1, Math.max(0, segDone));
        const reward = rewards.find((r) => r.milestone_id === m.id);
        const Inner = (
          <>
            <div className="h-1.5 rounded-full well overflow-hidden mb-2">
              <div className="h-full rounded-full" style={{ width: `${fill * 100}%`, background: done ? "#9567E8" : "linear-gradient(90deg,#496CFF,#6F8BFF)" }} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`grid place-items-center size-4 rounded-full shrink-0 ${done ? "bg-orchid text-white" : m.is_ultimate ? "border border-orchid text-orchid-soft" : "border border-line-strong text-muted"}`} aria-hidden>
                {done ? <Check className="size-2.5" /> : m.is_ultimate ? <Star className="size-2.5" /> : null}
              </span>
              <span className={`t-num text-xs font-semibold truncate ${done ? "text-orchid-soft" : "text-ice"}`}>{fmtCompact(m.target_value, goal.unit)}</span>
              {reward && <Gift className={`size-3 shrink-0 ${reward.granted_at ? "text-orchid-soft" : "text-muted"}`} aria-label={`Reward: ${reward.title}`} />}
            </div>
            <p className="text-[0.6875rem] text-muted truncate">{m.name}</p>
            <p className="text-[0.6875rem] text-muted/80 t-num">{done ? `behaald ${fmtDate(m.achieved_at, "d MMM")}` : m.target_date ? `doel ${fmtDate(m.target_date, "d MMM")}` : ""}</p>
          </>
        );
        const cls = `text-left min-w-0 rounded-[4px] p-1.5 -m-1.5 transition-colors ${selectedId === m.id ? "bg-ice/6" : onSelect ? "hover:bg-ice/4" : ""}`;
        return (
          <li key={m.id} className="min-w-0">
            {onSelect ? (
              <button type="button" onClick={() => onSelect(m)} className={`w-full ${cls}`} aria-pressed={selectedId === m.id}>
                {Inner}
              </button>
            ) : (
              <div className={cls}>{Inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
