import Link from "next/link";
import { Flame } from "lucide-react";
import type { KpiView } from "@/lib/data/kpis";
import type { Profile } from "@/lib/types";
import { AvatarStack, StatusPill } from "@/components/ui";
import { Sparkline } from "@/components/instruments/sparkline";
import { Delta } from "@/components/instruments/delta";
import { fmtValue, fmtRelative } from "@/lib/format";
import { FREQUENCY_LABELS, periodLabel } from "@/lib/periods";

export function KpiCard({ view, people, teamName, showCheckin = true }: { view: KpiView; people: Profile[]; teamName?: string | null; showCheckin?: boolean }) {
  const { kpi } = view;
  const tone = view.status === "achieved" ? "orchid" : view.status === "behind" ? "coral" : view.status === "needs_attention" ? "amber" : "cobalt";
  return (
    <article className="deck p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow">{kpi.category} · {FREQUENCY_LABELS[kpi.frequency]}{teamName ? ` · ${teamName}` : ""}</p>
          <h3 className="font-display font-semibold mt-1 leading-snug">
            <Link href={`/kpis/${kpi.id}`} className="hover:text-cobalt-soft">{kpi.name}</Link>
          </h3>
        </div>
        <StatusPill status={view.status} short size="xs" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="t-num leading-none">
            <span className="text-2xl font-bold">{fmtValue(view.value, kpi.unit)}</span>
            <span className="text-muted text-sm"> / {fmtValue(kpi.target_value, kpi.unit)}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Delta value={view.diff} unit={kpi.unit} higherBetter={kpi.direction === "higher_better"} suffix="t.o.v. target" />
            <Delta value={view.change} unit={kpi.unit} higherBetter={kpi.direction === "higher_better"} suffix="vs vorige" />
          </div>
        </div>
        <Sparkline values={view.seriesValues} target={kpi.target_value} tone={tone} higherBetter={kpi.direction === "higher_better"} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-muted">
        <span className="flex items-center gap-2">
          <AvatarStack people={people} size="xs" />
          {view.streak >= 2 && (
            <span className="inline-flex items-center gap-0.5 text-amber t-num font-semibold"><Flame className="size-3" aria-hidden /> {view.streak}×</span>
          )}
        </span>
        <span className="t-num">{view.lastCheckin ? `update ${fmtRelative(view.lastCheckin.created_at)}` : "nog geen check-in"}</span>
      </div>
      {showCheckin && !view.openPeriod.done && (
        <Link href={`/kpis/${kpi.id}?checkin=1`} className="text-xs font-semibold text-cobalt-soft hover:underline">
          Check-in {periodLabel(kpi.frequency, view.openPeriod.start)} invullen →
        </Link>
      )}
    </article>
  );
}
