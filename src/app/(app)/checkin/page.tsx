import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, periodLabel } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { Panel, EmptyState, StatusPill } from "@/components/ui";
import { fmtValue, fmtDate } from "@/lib/format";

export const metadata = { title: "Check-in" };

export default async function CheckinPage({ searchParams }: PageProps<"/checkin">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "week");
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const kpis = await listKpis(supabase, org.id);
  const ids = kpis.map((k) => k.id);
  const [assignments, checkins] = await Promise.all([listKpiAssignments(supabase, ids), listCheckins(supabase, ids, { limit: 800 })]);
  const mine = kpis.filter((k) => assignments.some((a) => a.kpi_id === k.id && a.profile_id === profile.id) || (k.scope === "team" && k.team_id && dir.teamsOf(profile.id).some((t) => t.id === k.team_id)));
  const views = mine.map((k) => buildKpiView(k, assignments, checkins, period, profile.id));
  const open = views.filter((v) => !v.openPeriod.done);
  const done = views.filter((v) => v.openPeriod.done);

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Snel invullen" title="KPI-check-in" description="Tik je KPI's af voor de open periode. Elke check-in telt mee voor je bijdragescore; op tijd invullen levert extra punten op." />
      {views.length === 0 ? (
        <EmptyState title="Geen KPI's toegewezen" body="Zodra een admin je een KPI toewijst, verschijnt hier de check-in." action={<Link href="/kpis/new" className="text-sm font-semibold text-cobalt-soft">Zelf een persoonlijke KPI aanmaken</Link>} />
      ) : (
        <>
          <Panel eyebrow={`${open.length} open`} title="Wachten op jou" raised>
            {open.length === 0 ? (
              <p className="text-sm text-ice-dim inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-orchid-soft" aria-hidden /> Alles ingevuld. Sterk werk.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {open.map((v) => (
                  <li key={v.kpi.id} className="py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <Link href={`/kpis/${v.kpi.id}`} className="font-display font-semibold hover:text-cobalt-soft">{v.kpi.name}</Link>
                        <p className="text-xs text-muted t-num">{periodLabel(v.kpi.frequency, v.openPeriod.start)} · {fmtDate(v.openPeriod.start, "d MMM")} – {fmtDate(v.openPeriod.end, "d MMM")} · target {fmtValue(v.kpi.target_value, v.kpi.unit)}{v.previous !== null ? ` · vorige ${fmtValue(v.previous, v.kpi.unit)}` : ""}</p>
                      </div>
                      <StatusPill status={v.status} short size="xs" />
                    </div>
                    <CheckinForm kpi={v.kpi} period={v.openPeriod} compact />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {done.length > 0 && (
            <Panel eyebrow="Ingevuld" title="Deze periode al afgetikt" className="mt-6">
              <ul className="flex flex-col divide-y divide-line">
                {done.map((v) => (
                  <li key={v.kpi.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0"><Link href={`/kpis/${v.kpi.id}`} className="font-semibold hover:text-cobalt-soft block truncate">{v.kpi.name}</Link><span className="text-xs text-muted t-num">{periodLabel(v.kpi.frequency, v.openPeriod.start)}</span></span>
                    <span className="flex items-center gap-2"><span className="t-num font-semibold">{fmtValue(v.value, v.kpi.unit)}</span><StatusPill status={v.status} short size="xs" /></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
