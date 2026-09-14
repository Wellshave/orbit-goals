import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, periodLabel } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { Panel, EmptyState, StatusPill } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { fmtValue, fmtDate } from "@/lib/format";

export const metadata = { title: "Check-ins" };

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
    <div className="max-w-2xl pt-2">
      <PageHeader help="checkin" icon="checkin" tone="mint" eyebrow="Snel invullen" title={open.length === 0 ? "Alles is ingevuld" : open.length === 1 ? "Eén check-in wacht op jou" : `${open.length} check-ins wachten op jou`} description="Vul je waarde in en tik af. Elke check-in telt mee voor je score; op tijd invullen levert extra punten op." />
      {views.length === 0 ? (
        <EmptyState icon="kpi" title="Geen KPI's toegewezen" body="Zodra een beheerder je een KPI toewijst, verschijnt hier de check-in." action={<Link href="/kpis/new" className="text-sm font-semibold text-blue-deep">Zelf een persoonlijke KPI aanmaken</Link>} />
      ) : (
        <>
          {open.length === 0 ? (
            <div className="tile soft-mint p-6 flex items-center gap-4"><ClayIcon name="check" tone="mint" size="xl" className="bg-white" /><div><p className="font-display font-extrabold text-xl">Lekker bezig, alles is bij.</p><p className="t-muted">Nieuwe check-ins verschijnen zodra een periode afloopt.</p></div></div>
          ) : (
            <ul className="flex flex-col gap-4">
              {open.map((v, idx) => (
                <li key={v.kpi.id} className="card p-5" data-tour={idx === 0 ? "checkin-card" : undefined}>
                  <div className="flex items-start gap-3 mb-3">
                    <ClayIcon name="kpi" tone="mint" size="lg" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/kpis/${v.kpi.id}`} className="font-display font-extrabold text-lg leading-tight hover:text-blue-deep">{v.kpi.name}</Link>
                      <p className="text-sm t-muted mt-0.5">Target <strong className="text-ink">{fmtValue(v.kpi.target_value, v.kpi.unit)}</strong> · {periodLabel(v.kpi.frequency, v.openPeriod.start)} ({fmtDate(v.openPeriod.start, "d MMM")} – {fmtDate(v.openPeriod.end, "d MMM")}){v.previous !== null ? ` · vorige keer ${fmtValue(v.previous, v.kpi.unit)}` : ""}</p>
                    </div>
                    <StatusPill status={v.status} size="xs" />
                  </div>
                  <CheckinForm kpi={v.kpi} period={v.openPeriod} compact />
                </li>
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <Panel eyebrow="Klaar" title="Deze periode al afgetikt" className="mt-6">
              <ul className="divide-y divide-line">
                {done.map((v) => (
                  <li key={v.kpi.id} className="py-3 flex items-center gap-3 text-sm">
                    <ClayIcon name="check" tone="mint" size="sm" />
                    <span className="min-w-0 flex-1"><Link href={`/kpis/${v.kpi.id}`} className="font-semibold hover:text-blue-deep block truncate">{v.kpi.name}</Link><span className="text-xs t-muted">{periodLabel(v.kpi.frequency, v.openPeriod.start)}</span></span>
                    <span className="font-display font-extrabold tnum">{fmtValue(v.value, v.kpi.unit)}</span>
                    <StatusPill status={v.status} size="xs" />
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
