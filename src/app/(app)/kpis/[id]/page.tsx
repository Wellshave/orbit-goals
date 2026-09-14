import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { buildKpiView, listCheckins, listKpiAssignments } from "@/lib/data/kpis";
import { resolvePeriod, periodLabel, periodWord, periodForFrequency, shiftPeriod, toISODate } from "@/lib/periods";
import { PageHeader } from "@/components/shell/page-header";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { Radial } from "@/components/instruments/radial";
import { MiniBars } from "@/components/instruments/mini-bars";
import { Panel, StatusPill, Avatar, ButtonLink, Tile } from "@/components/ui";
import { fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { kpiHit, STATUS_META } from "@/lib/status";
import { explainKpi, explainKpiChange } from "@/lib/explain";
import type { Kpi } from "@/lib/types";

export default async function KpiPage({ params, searchParams }: PageProps<"/kpis/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, isAdmin, locale, t } = await getSession();
  const period = resolvePeriod(sp, "year", locale);
  const dir = await getDirectory();
  const { data } = await supabase.from("kpis").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const kpi = data as Kpi;
  const [assignments, checkins] = await Promise.all([listKpiAssignments(supabase, [id]), listCheckins(supabase, [id])]);
  const view = buildKpiView(kpi, assignments, checkins, period);
  const mine = assignments.some((a) => a.profile_id === profile.id);
  const canCheckin = mine || isAdmin || kpi.owner_id === profile.id || (kpi.scope === "team" && kpi.team_id !== null && dir.teamsOf(profile.id).some((tm) => tm.id === kpi.team_id));
  const canManage = isAdmin || kpi.owner_id === profile.id || kpi.created_by === profile.id;
  const cur = periodForFrequency(kpi.frequency, new Date());
  const prevStart = shiftPeriod(kpi.frequency, cur.start, -1);
  const prevP = { start: prevStart, end: periodForFrequency(kpi.frequency, prevStart).end };
  const myCheckin = (start: Date) => checkins.find((c) => c.profile_id === profile.id && c.period_start === toISODate(start)) ?? null;
  const byPeriod = new Map<string, number>();
  for (const c of checkins) byPeriod.set(c.period_start, (byPeriod.get(c.period_start) ?? 0) + Number(c.value));
  const series = Array.from(byPeriod.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const tone = STATUS_META[view.status].tone;
  const hits = series.filter(([, v]) => kpiHit(kpi, v)).length;
  const pw = periodWord(t, kpi.frequency);

  return (
    <div className="pt-2">
      <PageHeader help="kpi-detail" icon="kpi" tone={tone} eyebrow={`${kpi.category} · ${t(`freq.${kpi.frequency}`)} · ${t(`scope.${kpi.scope}`)}${kpi.team_id ? ` · ${dir.teamById.get(kpi.team_id)?.name}` : ""}`} title={kpi.name} description={kpi.description || undefined} actions={<><StatusPill status={view.status} />{canManage && <ButtonLink href={`/kpis/${kpi.id}/edit`} variant="secondary" size="sm"><Pencil className="size-3.5" aria-hidden /> {t("common.edit")}</ButtonLink>}</>} />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <section className="card-lift p-6 sm:p-8 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <Radial value={Math.min(1, view.ratio ?? 0)} size={150} stroke={14} tone={tone} label={`${pct(Math.min(1, view.ratio ?? 0))} ${t("kpiDetail.ofTarget")}`}>
              <div><p className="font-display font-extrabold text-2xl leading-none">{pct(Math.min(1.5, view.ratio ?? 0))}</p><p className="text-xs t-muted mt-1">{t("kpiDetail.ofTarget")}</p></div>
            </Radial>
            <div>
              <p className="font-display font-extrabold text-4xl leading-none">{fmtValue(view.value, kpi.unit)} <span className="text-lg t-muted font-bold">{t("common.of")} {fmtValue(kpi.target_value, kpi.unit)}</span></p>
              <p className="mt-2 text-lg text-ink-2">{explainKpi(t, view)} {explainKpiChange(t, view, pw) ?? ""}</p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Tile tone="coral" icon="flame" label={t("kpiDetail.streak")} value={`${view.streak}×`} sub={t("common.periodsInARow", { w: pw })} />
                <Tile tone="mint" icon="check" label={t("kpiDetail.hit")} value={`${hits}/${series.length}`} sub={t("kpiDetail.ofLast")} />
                <Tile tone="blue" icon="trend" label={t("kpiDetail.expectedNext")} value={view.forecast === null ? "–" : fmtValue(view.forecast, kpi.unit)} sub={t("kpiDetail.atTrend")} />
              </div>
            </div>
          </section>

          <Panel eyebrow={t("kpiDetail.course")} title={t("kpiDetail.lastN", { n: series.length, p: pw })}>
            {series.length < 2 ? <p className="text-sm t-muted">{t("kpiDetail.tooFew")}</p> : (
              <div>
                <MiniBars values={series.map(([, v]) => v)} target={kpi.target_value} higherBetter={kpi.direction === "higher_better"} height={120} labels={series.map(([k]) => periodLabel(kpi.frequency, new Date(k), locale))} />
                <div className="flex gap-1 mt-1.5">{series.map(([k]) => <span key={k} className="flex-1 min-w-[6px] max-w-[18px] text-[0.625rem] t-muted text-center truncate">{periodLabel(kpi.frequency, new Date(k), locale).replace(/^Wk /, "")}</span>)}</div>
                <p className="text-xs t-muted mt-2">{t("kpiDetail.legend")}</p>
              </div>
            )}
          </Panel>

          <Panel eyebrow={t("kpiDetail.history")} title={t("kpiDetail.allCheckins")}>
            {checkins.length === 0 ? <p className="text-sm t-muted">{t("kpiDetail.noCheckins")}</p> : (
              <ul className="divide-y divide-line">
                {checkins.map((c) => { const p = dir.byId.get(c.profile_id); const hit = kpiHit(kpi, Number(c.value)); return (
                  <li key={c.id} className="py-3 flex items-center gap-3 text-sm">
                    <Avatar name={p?.full_name ?? "?"} src={p?.avatar_url} size="sm" ring />
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{periodLabel(kpi.frequency, new Date(c.period_start), locale)} <span className="t-muted font-normal">· {p?.full_name.split(" ")[0]}</span></span>{c.note && <span className="block text-xs t-muted truncate">{c.note}</span>}</span>
                    <span className="font-display font-extrabold tnum">{fmtValue(Number(c.value), kpi.unit)}</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${hit ? "bg-mintsoft text-mint-deep" : "bg-peach text-coral-deep"}`}>{hit ? t("kpiDetail.hitShort") : t("kpiDetail.missShort")}</span>
                    <span className="text-xs t-muted hidden sm:block">{fmtDate(c.created_at, "d MMM", locale)}</span>
                  </li>
                ); })}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          {canCheckin ? (
            <>
              {!myCheckin(prevP.start) && kpi.frequency !== "daily" && (
                <Panel eyebrow={t("kpiDetail.waiting")} title={t("kpiDetail.checkinFor", { p: periodLabel(kpi.frequency, prevP.start, locale) })} tone="mint" raised><div className="bg-white/80 rounded-2xl p-4"><CheckinForm kpi={kpi} period={prevP} /></div></Panel>
              )}
              <Panel eyebrow={myCheckin(cur.start) ? t("kpiDetail.filled") : t("kpiDetail.currentPeriod")} title={t("kpiDetail.checkinFor", { p: periodLabel(kpi.frequency, cur.start, locale) })}><CheckinForm kpi={kpi} period={cur} existing={myCheckin(cur.start)} /></Panel>
            </>
          ) : (
            <Panel eyebrow={t("nav.checkins")} title={t("kpiDetail.notAssigned")}><p className="text-sm t-muted">{t("kpiDetail.notAssignedBody")}</p></Panel>
          )}
          <Panel eyebrow={t("kpiDetail.who")} title={t("kpiDetail.responsible")}>
            <ul className="flex flex-col gap-3">
              {kpi.owner_id && dir.byId.get(kpi.owner_id) && <li className="flex items-center gap-3"><Avatar name={dir.byId.get(kpi.owner_id)!.full_name} src={dir.byId.get(kpi.owner_id)!.avatar_url} size="md" ring /><span><span className="block font-bold text-sm">{dir.byId.get(kpi.owner_id)!.full_name}</span><span className="block text-xs t-muted">{t("kpiDetail.owner")}</span></span></li>}
              {assignments.filter((a) => a.profile_id !== kpi.owner_id).map((a) => { const p = dir.byId.get(a.profile_id); if (!p) return null; return <li key={a.profile_id} className="flex items-center gap-3"><Avatar name={p.full_name} src={p.avatar_url} size="md" ring /><span><span className="block font-bold text-sm"><Link href={`/people/${p.id}`} className="hover:text-blue-deep">{p.full_name}</Link></span><span className="block text-xs t-muted">{t("kpiDetail.fillsIn")}</span></span></li>; })}
            </ul>
            {(kpi.source_note || kpi.period_end) && <p className="mt-4 text-xs t-muted">{kpi.source_note ? t("kpiDetail.source", { s: kpi.source_note }) : ""}{kpi.period_end ? t("kpiDetail.deadline", { d: fmtDate(kpi.period_end, "d MMM yyyy", locale) }) : ""}</p>}
            {view.lastCheckin && <p className="text-xs t-muted mt-1">{t("kpiDetail.lastUpdate", { t: fmtRelative(view.lastCheckin.created_at, locale) })}</p>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
