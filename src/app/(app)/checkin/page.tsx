import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, periodLabel } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { Panel, EmptyState, StatusPill } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { fmtValue, fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("checkin.title") };
}

export default async function CheckinPage({ searchParams }: PageProps<"/checkin">) {
  const sp = await searchParams;
  const { supabase, org, profile, locale, t } = await getSession();
  const period = resolvePeriod(sp, "week", locale);
  const dir = await getDirectory();
  const kpis = await listKpis(supabase, org.id);
  const ids = kpis.map((k) => k.id);
  const [assignments, checkins] = await Promise.all([listKpiAssignments(supabase, ids), listCheckins(supabase, ids, { limit: 800 })]);
  const mine = kpis.filter((k) => assignments.some((a) => a.kpi_id === k.id && a.profile_id === profile.id) || (k.scope === "team" && k.team_id && dir.teamsOf(profile.id).some((tm) => tm.id === k.team_id)));
  const views = mine.map((k) => buildKpiView(k, assignments, checkins, period, profile.id));
  const open = views.filter((v) => !v.openPeriod.done);
  const done = views.filter((v) => v.openPeriod.done);

  return (
    <div className="max-w-2xl pt-2">
      <PageHeader help="checkin" icon="checkin" tone="mint" eyebrow={t("checkin.eyebrow")} title={open.length === 0 ? t("checkin.allDone") : open.length === 1 ? t("checkin.oneWaiting") : t("checkin.manyWaiting", { n: open.length })} description={t("checkin.sub")} />
      {views.length === 0 ? (
        <EmptyState icon="kpi" title={t("checkin.noKpis")} body={t("checkin.noKpisBody")} action={<Link href="/kpis/new" className="text-sm font-semibold text-blue-deep">{t("checkin.createOwn")}</Link>} />
      ) : (
        <>
          {open.length === 0 ? (
            <div className="tile soft-mint p-6 flex items-center gap-4"><ClayIcon name="check" tone="mint" size="xl" className="bg-white" /><div><p className="font-display font-extrabold text-xl">{t("checkin.allCaughtUp")}</p><p className="t-muted">{t("checkin.allCaughtUpSub")}</p></div></div>
          ) : (
            <ul className="flex flex-col gap-4">
              {open.map((v, idx) => (
                <li key={v.kpi.id} className="card p-5" data-tour={idx === 0 ? "checkin-card" : undefined}>
                  <div className="flex items-start gap-3 mb-3">
                    <ClayIcon name="kpi" tone="mint" size="lg" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/kpis/${v.kpi.id}`} className="font-display font-extrabold text-lg leading-tight hover:text-blue-deep">{v.kpi.name}</Link>
                      <p className="text-sm t-muted mt-0.5">{t("checkin.targetLine", { v: fmtValue(v.kpi.target_value, v.kpi.unit), p: periodLabel(v.kpi.frequency, v.openPeriod.start, locale), a: fmtDate(v.openPeriod.start, "d MMM", locale), b: fmtDate(v.openPeriod.end, "d MMM", locale) })}{v.previous !== null ? t("checkin.lastTime", { v: fmtValue(v.previous, v.kpi.unit) }) : ""}</p>
                    </div>
                    <StatusPill status={v.status} size="xs" />
                  </div>
                  <CheckinForm kpi={v.kpi} period={v.openPeriod} compact />
                </li>
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <Panel eyebrow={t("checkin.done")} title={t("checkin.doneTitle")} className="mt-6">
              <ul className="divide-y divide-line">
                {done.map((v) => (
                  <li key={v.kpi.id} className="py-3 flex items-center gap-3 text-sm">
                    <ClayIcon name="check" tone="mint" size="sm" />
                    <span className="min-w-0 flex-1"><Link href={`/kpis/${v.kpi.id}`} className="font-semibold hover:text-blue-deep block truncate">{v.kpi.name}</Link><span className="text-xs t-muted">{periodLabel(v.kpi.frequency, v.openPeriod.start, locale)}</span></span>
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
