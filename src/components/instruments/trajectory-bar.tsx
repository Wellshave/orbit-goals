import type { Goal, Milestone } from "@/lib/types";
import { goalExpected, goalProgress, milestonePosition } from "@/lib/status";
import { clamp, fmtCompact, pct } from "@/lib/format";

/**
 * Trajectory bar: één instrument dat huidige voortgang, verwacht tempo,
 * milestone-posities, targetlijn en risicozone toont. Kleur is nooit het enige signaal:
 * de verwachte positie heeft een eigen markering en label.
 */
export function TrajectoryBar({
  goal,
  milestones = [],
  previous,
  compact = false,
  showLabels = true,
}: {
  goal: Goal;
  milestones?: Milestone[];
  previous?: number | null;
  compact?: boolean;
  showLabels?: boolean;
}) {
  const p = clamp(goalProgress(goal), 0, 1);
  const e = goalExpected(goal);
  const prev = previous !== null && previous !== undefined ? clamp(goalProgress({ ...goal, current_value: previous }), 0, 1) : null;
  const behind = p < e * 0.9 && goal.status !== "achieved";
  const fill =
    goal.status === "achieved"
      ? "linear-gradient(90deg, #9567E8, #B391F2)"
      : behind
        ? "linear-gradient(90deg, #FF715B, #FF9483)"
        : "linear-gradient(90deg, #496CFF, #6F8BFF)";
  const h = compact ? "h-2" : "h-3.5";

  return (
    <div className="w-full">
      <div className={`relative ${h} well overflow-visible rounded-full`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={`Voortgang ${pct(p)}, verwacht ${pct(e)}`}>
        {/* risicozone: het gebied tussen 70% en 100% van het verwachte tempo */}
        {goal.status !== "achieved" && e > 0 && (
          <span aria-hidden className="absolute inset-y-0 rounded-full bg-coral/10" style={{ left: `${e * 70}%`, width: `${e * 30}%` }} />
        )}
        {/* vorige periode */}
        {prev !== null && prev < p && (
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-ice/10" style={{ width: `${prev * 100}%` }} />
        )}
        {/* voortgang */}
        <span aria-hidden className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p * 100}%`, background: fill, boxShadow: "0 0 14px -2px rgba(73,108,255,0.6)" }} />
        {/* milestones */}
        {milestones.map((m) => {
          const x = milestonePosition(goal, m.target_value);
          const done = m.status === "achieved";
          return (
            <span
              key={m.id}
              aria-hidden
              title={m.name}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${compact ? "size-2" : "size-3"} rotate-45 border ${
                done ? "bg-orchid border-orchid-soft" : "bg-ink-deep border-ice/50"
              } ${m.is_ultimate ? "ring-2 ring-orchid/40" : ""}`}
              style={{ left: `${x * 100}%` }}
            />
          );
        })}
        {/* verwacht tempo */}
        {goal.status !== "achieved" && (
          <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-ice/80" style={{ left: `${e * 100}%` }}>
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-ice" />
          </span>
        )}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex items-center justify-between t-num text-[0.6875rem] text-muted">
          <span>
            <span className="text-ice font-semibold">{pct(p)}</span> · {fmtCompact(goal.current_value, goal.unit)}
          </span>
          {goal.status !== "achieved" && <span>verwacht {pct(e)}</span>}
          <span>target {fmtCompact(goal.target_value, goal.unit)}</span>
        </div>
      )}
    </div>
  );
}
