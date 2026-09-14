import Link from "next/link";
import { Flame } from "lucide-react";
import type { KpiView } from "@/lib/data/kpis";
import type { Profile } from "@/lib/types";
import { AvatarStack, StatusPill } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { RatioBar } from "@/components/instruments/progress-bar";
import { MiniBars } from "@/components/instruments/mini-bars";
import { fmtValue } from "@/lib/format";
import { explainKpi, explainKpiChange } from "@/lib/explain";
import { periodLabel } from "@/lib/periods";
import { STATUS_META } from "@/lib/status";

const PERIOD_WORD = { daily: "dag", weekly: "week", monthly: "maand", quarterly: "kwartaal", yearly: "jaar" } as const;

export function KpiCard({ view, people, showCheckin = true }: { view: KpiView; people: Profile[]; teamName?: string | null; showCheckin?: boolean }) {
  const { kpi } = view;
  const tone = STATUS_META[view.status].tone;
  return (
    <article className="card hover-lift p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ClayIcon name="kpi" tone={tone} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-extrabold leading-snug"><Link href={`/kpis/${kpi.id}`} className="hover:text-blue-deep">{kpi.name}</Link></h3>
          <p className="text-xs t-muted mt-0.5">Target {fmtValue(kpi.target_value, kpi.unit)} per {PERIOD_WORD[kpi.frequency]}</p>
        </div>
        <StatusPill status={view.status} size="xs" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display font-extrabold text-2xl leading-none">{fmtValue(view.value, kpi.unit)}</p>
          <p className="text-sm t-muted mt-1">{explainKpi(view)}</p>
        </div>
        <MiniBars values={view.seriesValues.slice(-6)} target={kpi.target_value} higherBetter={kpi.direction === "higher_better"} />
      </div>
      <RatioBar ratio={view.ratio} tone={tone} />
      <div className="flex items-center justify-between gap-2 text-xs t-muted">
        <span className="flex items-center gap-2"><AvatarStack people={people} size="xs" />{view.streak >= 2 && <span className="inline-flex items-center gap-0.5 text-coral-deep font-bold"><Flame className="size-3.5" aria-hidden /> {view.streak}× op rij</span>}</span>
        <span>{explainKpiChange(view, PERIOD_WORD[kpi.frequency]) ?? ""}</span>
      </div>
      {showCheckin && !view.openPeriod.done && (
        <Link href={`/kpis/${kpi.id}`} className="press inline-flex items-center justify-center rounded-full bg-mintsoft text-mint-deep font-semibold text-sm py-2 hover:bg-mint hover:text-ink">Check-in {periodLabel(kpi.frequency, view.openPeriod.start)} invullen</Link>
      )}
    </article>
  );
}
