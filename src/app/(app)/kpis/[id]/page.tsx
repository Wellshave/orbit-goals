import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Flame } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { buildKpiView, listCheckins, listKpiAssignments } from "@/lib/data/kpis";
import { resolvePeriod, periodLabel, FREQUENCY_LABELS, periodForFrequency, shiftPeriod, toISODate } from "@/lib/periods";
import { PageHeader } from "@/components/shell/page-header";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { TrendChart } from "@/components/charts/trend-chart";
import { Radial } from "@/components/instruments/radial";
import { Delta } from "@/components/instruments/delta";
import { Panel, Stat, StatusPill, Avatar, ButtonLink } from "@/components/ui";
import { fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { kpiHit, SCOPE_LABELS } from "@/lib/status";
import type { Kpi } from "@/lib/types";

export default async function KpiPage({ params, searchParams }: PageProps<"/kpis/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const period = resolvePeriod(sp, "year");
  const { supabase, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const { data } = await supabase.from("kpis").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const kpi = data as Kpi;
  const [assignments, checkins] = await Promise.all([listKpiAssignments(supabase, [id]), listCheckins(supabase, [id])]);
  const view = buildKpiView(kpi, assignments, checkins, period, kpi.scope === "personal" ? undefined : undefined);
  const mine = assignments.some((a) => a.profile_id === profile.id);
  const canCheckin = mine || isAdmin || kpi.owner_id === profile.id || (kpi.scope === "team" && kpi.team_id !== null && dir.teamsOf(profile.id).some((t) => t.id === kpi.team_id));
  const canManage = isAdmin || kpi.owner_id === profile.id || kpi.created_by === profile.id;

  // Open periodes voor mij: vorige (indien niet ingevuld) + huidige
  const cur = periodForFrequency(kpi.frequency, new Date());
  const prevStart = shiftPeriod(kpi.frequency, cur.start, -1);
  const prevP = { start: prevStart, end: periodForFrequency(kpi.frequency, prevStart).end };
  const myCheckin = (start: Date) => checkins.find((c) => c.profile_id === profile.id && c.period_start === toISODate(start)) ?? null;

  const byPeriod = new Map<string, number>();
  for (const c of checkins) byPeriod.set(c.period_start, (byPeriod.get(c.period_start) ?? 0) + Number(c.value));
  const series = Array.from(byPeriod.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-16).map(([k, v]) => ({ label: periodLabel(kpi.frequency, new Date(k)), value: v }));
  const ratio = view.ratio ?? 0;
  const tone = view.status === "achieved" ? "orchid" : view.status === "behind" ? "coral" : view.status === "needs_attention" ? "amber" : "cobalt";

  return (
    <>
      <PageHeader eyebrow={`${kpi.category} · ${FREQUENCY_LABELS[kpi.frequency]} · ${SCOPE_LABELS[kpi.scope]}${kpi.team_id ? ` · ${dir.teamById.get(kpi.team_id)?.name}` : ""}`} title={kpi.name} description={kpi.description || undefined} actions={<><StatusPill status={view.status} />{canManage && <ButtonLink href={`/kpis/${kpi.id}/edit`} variant="secondary" size="sm"><Pencil className="size-3.5" aria-hidden /> Bewerken</ButtonLink>}</>} />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <section className="deck-raised p-5 sm:p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center" aria-label="Huidige stand">
            <Radial value={Math.min(1, ratio)} size={150} stroke={12} tone={tone} label={`${pct(Math.min(1, ratio))} van target`}>
              <div><p className="t-num text-2xl font-bold leading-none">{pct(Math.min(1.5, ratio))}</p><p className="text-[0.625rem] text-muted mt-1 uppercase tracking-wider font-mono">van target</p></div>
            </Radial>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Werkelijke waarde" value={fmtValue(view.value, kpi.unit)} sub={view.lastCheckin ? `${periodLabel(kpi.frequency, new Date(view.lastCheckin.period_start))} · ${fmtRelative(view.lastCheckin.created_at)}` : "nog geen check-in"} />
              <Stat label="Target" value={fmtValue(kpi.target_value, kpi.unit)} sub={kpi.direction === "higher_better" ? "hoger is beter" : "lager is beter"} tone="muted" />
              <Stat label="Verschil t.o.v. target" value={<Delta value={view.diff} unit={kpi.unit} higherBetter={kpi.direction === "higher_better"} />} size="sm" />
              <Stat label="Vs. vorige periode" value={<Delta value={view.change} unit={kpi.unit} higherBetter={kpi.direction === "higher_better"} />} size="sm" />
              <Stat label="Verwachte volgende" value={view.forecast === null ? "–" : fmtValue(view.forecast, kpi.unit)} sub="lineaire trend" size="sm" tone="muted" />
              <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame className={`size-5 ${view.streak >= 3 ? "text-amber" : "text-muted"}`} aria-hidden />{view.streak}×</span>} sub="periodes op rij gehaald" size="sm" />
            </div>
          </section>

          <Panel eyebrow="Trend" title="Verloop per periode">
            {series.length < 2 ? <p className="text-sm text-muted">Nog te weinig check-ins voor een grafiek.</p> : <TrendChart data={series} target={kpi.target_value} unit={kpi.unit} tone={{ cobalt: "#496CFF", orchid: "#9567E8", coral: "#FF715B", amber: "#F2B84B" }[tone]} height={240} />}
          </Panel>

          <Panel eyebrow="Historie" title="Check-ins">
            {checkins.length === 0 ? <p className="text-sm text-muted">Nog geen check-ins.</p> : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead><tr className="t-eyebrow text-left"><th className="py-2 pr-3 font-normal">Periode</th><th className="py-2 pr-3 font-normal">Wie</th><th className="py-2 pr-3 font-normal text-right">Waarde</th><th className="py-2 pr-3 font-normal">Status</th><th className="py-2 pr-3 font-normal">Toelichting</th><th className="py-2 font-normal text-right">Ingevuld</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {checkins.map((c) => {
                      const p = dir.byId.get(c.profile_id);
                      const hit = kpiHit(kpi, Number(c.value));
                      return (
                        <tr key={c.id}>
                          <td className="py-2 pr-3 t-num whitespace-nowrap">{periodLabel(kpi.frequency, new Date(c.period_start))}</td>
                          <td className="py-2 pr-3"><span className="inline-flex items-center gap-1.5"><Avatar name={p?.full_name ?? "?"} src={p?.avatar_url} size="xs" />{p?.full_name.split(" ")[0]}</span></td>
                          <td className="py-2 pr-3 t-num text-right font-semibold">{fmtValue(Number(c.value), kpi.unit)}</td>
                          <td className="py-2 pr-3"><span className={`text-xs font-semibold ${hit ? "text-orchid-soft" : "text-coral-soft"}`}>{hit ? "★ gehaald" : "▼ niet gehaald"}</span></td>
                          <td className="py-2 pr-3 text-muted max-w-[16rem] truncate">{c.note}</td>
                          <td className="py-2 t-num text-right text-muted whitespace-nowrap">{fmtDate(c.created_at, "d MMM HH:mm")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          {canCheckin ? (
            <>
              {!myCheckin(prevP.start) && kpi.frequency !== "daily" && (
                <Panel eyebrow="Open" title={`Check-in ${periodLabel(kpi.frequency, prevP.start)}`} raised>
                  <CheckinForm kpi={kpi} period={prevP} />
                </Panel>
              )}
              <Panel eyebrow={myCheckin(cur.start) ? "Ingevuld" : "Lopende periode"} title={`Check-in ${periodLabel(kpi.frequency, cur.start)}`}>
                <CheckinForm kpi={kpi} period={cur} existing={myCheckin(cur.start)} />
              </Panel>
            </>
          ) : (
            <Panel eyebrow="Check-in" title="Niet aan jou toegewezen"><p className="text-sm text-muted">Alleen toegewezen personen, de eigenaar of admins kunnen check-ins invullen.</p></Panel>
          )}
          <Panel eyebrow="Verantwoordelijk" title="Wie">
            <ul className="flex flex-col gap-2">
              {kpi.owner_id && dir.byId.get(kpi.owner_id) && (
                <li className="flex items-center gap-2.5"><Avatar name={dir.byId.get(kpi.owner_id)!.full_name} src={dir.byId.get(kpi.owner_id)!.avatar_url} size="sm" /><span><span className="block text-sm font-semibold">{dir.byId.get(kpi.owner_id)!.full_name}</span><span className="block text-xs text-muted">eigenaar</span></span></li>
              )}
              {assignments.filter((a) => a.profile_id !== kpi.owner_id).map((a) => { const p = dir.byId.get(a.profile_id); if (!p) return null; return (
                <li key={a.profile_id} className="flex items-center gap-2.5"><Avatar name={p.full_name} src={p.avatar_url} size="sm" /><span><span className="block text-sm font-semibold"><Link href={`/people/${p.id}`} className="hover:text-cobalt-soft">{p.full_name}</Link></span><span className="block text-xs text-muted">toegewezen</span></span></li>
              ); })}
            </ul>
            {kpi.source_note && <p className="mt-4 text-xs text-muted">Bron: {kpi.source_note}</p>}
            {kpi.period_end && <p className="mt-1 text-xs text-muted">Deadline: {fmtDate(kpi.period_end)}</p>}
          </Panel>
        </aside>
      </div>
    </>
  );
}
