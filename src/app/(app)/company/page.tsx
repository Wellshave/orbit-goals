import Link from "next/link";
import { Star } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getGoalBundle, listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalOrbit } from "@/components/orbit/goal-orbit";
import { TrajectoryBar } from "@/components/instruments/trajectory-bar";
import { TrendChart, type TrendPoint } from "@/components/charts/trend-chart";
import { GoalCard } from "@/components/goals/goal-card";
import { Panel, Stat, StatusPill, Avatar, EmptyState, ButtonLink } from "@/components/ui";
import { Sparkline } from "@/components/instruments/sparkline";
import { Delta } from "@/components/instruments/delta";
import { goalExpected, goalForecast, goalProgress, STATUS_ORDER } from "@/lib/status";
import { fmtCompact, fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { format, eachMonthOfInterval, parseISO, startOfMonth } from "date-fns";
import { nl } from "date-fns/locale";
import { valueAt } from "@/lib/data/goals";
import type { ActivityEvent } from "@/lib/types";

export const metadata = { title: "Company" };

export default async function CompanyPage({ searchParams }: PageProps<"/company">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "quarter");
  const { supabase, org, profile, isAdmin } = await getSession();
  const dir = await getDirectory();

  const [goals, kpis, scoreRows, eventsRes] = await Promise.all([
    listGoals(supabase, org.id),
    listKpis(supabase, org.id),
    getScoreboard(supabase, period.from, period.to),
    supabase.from("activity_events").select("*").eq("org_id", org.id).gte("created_at", period.from.toISOString()).lt("created_at", period.to.toISOString()).order("created_at", { ascending: false }).limit(25),
  ]);
  const goalIds = goals.map((g) => g.id);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([
    listAssignments(supabase, goalIds),
    listMilestones(supabase, goalIds),
    listKpiAssignments(supabase, kpis.map((k) => k.id)),
    listCheckins(supabase, kpis.map((k) => k.id), { limit: 600 }),
  ]);

  const company = goals.filter((g) => g.goal_type === "company");
  const featured = company.find((g) => g.is_featured) ?? company[0] ?? goals[0];
  const bundle = featured ? await getGoalBundle(supabase, featured.id) : null;

  const activeGoals = goals.filter((g) => g.status !== "achieved");
  const avgProgress = activeGoals.length ? activeGoals.reduce((s, g) => s + Math.min(1, goalProgress(g)), 0) / activeGoals.length : 0;
  const atRisk = goals.filter((g) => g.status === "behind" || g.status === "needs_attention").sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const achievedMs = milestones.filter((m) => m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to);
  const contributors = scoreRows.length;

  const teamKpis = kpis.filter((k) => k.scope !== "personal" || k.category !== "Persoonlijk").slice(0, 8);
  const kpiViews = teamKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period));

  // Trajectgrafiek van het uitgelichte doel: per maand werkelijke stand vs verwachte lijn.
  let trend: TrendPoint[] = [];
  if (bundle && bundle.goal.measure === "numeric") {
    const g = bundle.goal;
    const months = eachMonthOfInterval({ start: parseISO(g.start_date), end: parseISO(g.deadline) });
    const now = new Date();
    trend = months.map((m) => {
      const endOfM = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      const value = endOfM <= now || startOfMonth(now).getTime() === m.getTime() ? valueAt(g, bundle.updates, endOfM <= now ? endOfM : now) : null;
      const expected = g.start_value + (g.target_value - g.start_value) * goalExpected(g, new Date(Math.min(endOfM.getTime() - 1, parseISO(g.deadline).getTime())));
      return { label: format(m, "MMM", { locale: nl }), value: value === null ? null : Number(value), expected };
    });
  }

  const teamTotals = dir.teams.map((t) => {
    const ids = dir.membersOf(t.id).map((m) => m.id);
    return { team: t, points: scoreRows.filter((r) => ids.includes(r.profile_id)).reduce((s, r) => s + r.total, 0), members: ids.length };
  }).sort((a, b) => b.points - a.points);

  const events = (eventsRes.data ?? []) as ActivityEvent[];
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);

  return (
    <>
      <PageHeader eyebrow={org.name} title="Company dashboard" description="Algemene voortgang, belangrijkste targets, risico's, milestones en bijdragen van het hele bedrijf." actions={isAdmin ? <ButtonLink href="/goals/new" size="sm">Company goal aanmaken</ButtonLink> : undefined}>
        <PeriodBar current={period.key} label={period.label} />
      </PageHeader>

      <section className="deck p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6" aria-label="Kerngetallen">
        <Stat label="Algemene voortgang" value={pct(avgProgress)} sub={`gemiddeld over ${activeGoals.length} actieve doelen`} tone="cobalt" />
        <Stat label="Doelen met risico" value={atRisk.length} sub={atRisk.length ? "aandacht nodig of achter" : "alles op schema"} tone={atRisk.length ? "coral" : "ice"} />
        <Stat label={`Milestones · ${period.short.toLowerCase()}`} value={achievedMs.length} sub="behaald in deze periode" tone="orchid" />
        <Stat label="Actieve bijdragers" value={contributors} sub={`van ${dir.members.length} teamleden`} />
      </section>

      {bundle ? (
        <section className="deck-raised p-5 sm:p-6 mb-6 grid lg:grid-cols-[minmax(0,460px)_1fr] gap-6 items-start" aria-labelledby="featured-title">
          <div>
            <GoalOrbit goal={bundle.goal} milestones={bundle.milestones} rewards={bundle.rewards} people={[dir.byId.get(bundle.goal.owner_id), ...bundle.assignments.map((a) => dir.byId.get(a.profile_id))].filter((p, i, arr) => p && arr.findIndex((x) => x?.id === p.id) === i).map((p) => ({ ...p!, orbitRole: p!.id === bundle.goal.owner_id ? "eigenaar" : "verantwoordelijk" }))} lastUpdateAt={bundle.updates[0]?.created_at ?? null} href={`/goals/${bundle.goal.id}`} size={400} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="t-eyebrow">Uitgelicht company goal</p>
              <StatusPill status={bundle.goal.status} size="xs" />
            </div>
            <h2 id="featured-title" className="t-display text-3xl sm:text-4xl">
              <Link href={`/goals/${bundle.goal.id}`} className="hover:text-cobalt-soft">{bundle.goal.title}</Link>
            </h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Huidige stand" value={fmtCompact(bundle.goal.current_value, bundle.goal.unit)} size="sm" />
              <Stat label="Target" value={fmtCompact(bundle.goal.target_value, bundle.goal.unit)} size="sm" tone="muted" />
              <Stat label="Verwachte eindwaarde" value={goalForecast(bundle.goal) !== null ? fmtCompact(goalForecast(bundle.goal)!, bundle.goal.unit) : "–"} size="sm" tone={goalForecast(bundle.goal) !== null && goalForecast(bundle.goal)! >= bundle.goal.target_value ? "cobalt" : "amber"} />
              <Stat label="Deadline" value={fmtDate(bundle.goal.deadline, "d MMM")} size="sm" tone="muted" />
            </div>
            <div className="mt-5">
              <TrajectoryBar goal={bundle.goal} milestones={bundle.milestones} />
            </div>
            {trend.length > 1 && (
              <div className="mt-5">
                <p className="t-eyebrow mb-2">Traject per maand · werkelijk vs verwacht</p>
                <TrendChart data={trend} target={bundle.goal.target_value} unit={bundle.goal.unit} kind="area" height={190} />
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="mb-6">
          <EmptyState title="Nog geen company goal" body="Maak het eerste bedrijfsdoel aan; het verschijnt hier als Goal Orbit." action={isAdmin ? <ButtonLink href="/goals/new" size="sm">Company goal aanmaken</ButtonLink> : undefined} />
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Belangrijkste targets" title="Company goals" actions={<Link href="/goals?type=company" className="text-xs font-semibold text-cobalt-soft hover:underline">Alle doelen</Link>}>
            {company.length === 0 ? <p className="text-sm text-muted">Nog geen company goals.</p> : (
              <div className="grid md:grid-cols-2 gap-3">
                {company.map((g) => (
                  <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} compact />
                ))}
              </div>
            )}
          </Panel>

          <Panel eyebrow="Trends" title="KPI-trends">
            {kpiViews.length === 0 ? <p className="text-sm text-muted">Nog geen KPI&apos;s.</p> : (
              <ul className="divide-y divide-line">
                {kpiViews.map((v) => (
                  <li key={v.kpi.id} className="py-2.5 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_130px_auto] items-center gap-3">
                    <div className="min-w-0">
                      <Link href={`/kpis/${v.kpi.id}`} className="text-sm font-semibold hover:text-cobalt-soft block truncate">{v.kpi.name}</Link>
                      <p className="text-[0.6875rem] text-muted truncate">{v.kpi.category} · {v.assignees.map((id) => dir.byId.get(id)?.full_name.split(" ")[0]).filter(Boolean).join(", ") || "team"}</p>
                    </div>
                    <div className="hidden sm:block"><Sparkline values={v.seriesValues} target={v.kpi.target_value} higherBetter={v.kpi.direction === "higher_better"} width={110} height={28} tone={v.status === "behind" ? "coral" : v.status === "achieved" ? "orchid" : "cobalt"} /></div>
                    <div className="text-right">
                      <p className="t-num font-semibold text-sm">{fmtValue(v.value, v.kpi.unit)} <span className="text-muted font-normal">/ {fmtValue(v.kpi.target_value, v.kpi.unit)}</span></p>
                      <Delta value={v.change} unit={v.kpi.unit} higherBetter={v.kpi.direction === "higher_better"} />
                    </div>
                    <StatusPill status={v.status} short size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="Bijdragen" title="Per persoon en per team" actions={<Link href="/scoreboard" className="text-xs font-semibold text-cobalt-soft hover:underline">Scorebord</Link>}>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <p className="t-eyebrow mb-2">Personen · {period.short.toLowerCase()}</p>
                <ol className="flex flex-col gap-1.5">
                  {scoreRows.slice(0, 6).map((r, i) => {
                    const p = dir.byId.get(r.profile_id);
                    if (!p) return null;
                    return (
                      <li key={r.profile_id} className="flex items-center gap-2.5 text-sm">
                        <span className="t-num text-muted w-4">{i + 1}</span>
                        <Avatar name={p.full_name} src={p.avatar_url} size="xs" />
                        <span className="flex-1 truncate">{p.full_name}{p.id === profile.id ? <span className="text-muted"> · jij</span> : ""}</span>
                        <span className="t-num font-semibold">{r.total}</span>
                      </li>
                    );
                  })}
                  {scoreRows.length === 0 && <li className="text-sm text-muted">Nog geen bijdragen.</li>}
                </ol>
              </div>
              <div>
                <p className="t-eyebrow mb-2">Teams</p>
                <ol className="flex flex-col gap-2">
                  {teamTotals.map((t) => (
                    <li key={t.team.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <Link href={`/teams/${t.team.id}`} className="font-semibold hover:text-cobalt-soft flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: t.team.color }} aria-hidden />{t.team.name}</Link>
                        <span className="t-num font-semibold">{t.points}</span>
                      </div>
                      <div className="h-1 rounded-full well overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${teamTotals[0]?.points ? (t.points / teamTotals[0].points) * 100 : 0}%`, background: t.team.color }} /></div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Panel>
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Risico" title="Goals die risico lopen">
            {atRisk.length === 0 ? <p className="text-sm text-muted">Geen doelen achter of met aandacht nodig.</p> : (
              <ul className="flex flex-col divide-y divide-line">
                {atRisk.slice(0, 6).map((g) => (
                  <li key={g.id} className="py-2.5">
                    <Link href={`/goals/${g.id}`} className="block hover:text-cobalt-soft">
                      <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold truncate">{g.title}</span><StatusPill status={g.status} short size="xs" /></span>
                      <span className="block text-[0.6875rem] text-muted t-num mt-0.5">{pct(goalProgress(g))} · verwacht {pct(goalExpected(g))} · {dir.byId.get(g.owner_id)?.full_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel eyebrow={period.label} title="Bereikte milestones">
            {achievedMs.length === 0 ? <p className="text-sm text-muted">Geen milestones in deze periode.</p> : (
              <ul className="flex flex-col gap-2">
                {achievedMs.slice(0, 8).map((m) => {
                  const g = goals.find((x) => x.id === m.goal_id)!;
                  return (
                    <li key={m.id}>
                      <Link href={`/goals/${g.id}?celebrate=${m.id}`} className="flex items-start gap-2.5 rounded-[4px] p-1.5 -m-1.5 hover:bg-ice/5">
                        <span className="grid place-items-center size-7 rounded-full bg-orchid text-white shrink-0" aria-hidden><Star className="size-3.5" /></span>
                        <span className="min-w-0"><span className="block text-sm font-semibold truncate">{m.name}</span><span className="block text-xs text-muted truncate">{g.title} · {fmtDate(m.achieved_at)}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Live" title="Teamactiviteit">
            {events.length === 0 ? <p className="text-sm text-muted">Geen activiteit in deze periode.</p> : (
              <ul className="flex flex-col gap-2.5">
                {events.slice(0, 12).map((e) => {
                  const actor = e.actor_id ? dir.byId.get(e.actor_id) : null;
                  const p = e.payload as Record<string, string | number>;
                  const goal = e.goal_id ? goals.find((g) => g.id === e.goal_id) : null;
                  const text = e.kind === "goal_update" ? `voortgang naar ${fmtValue(Number(p.new), goal?.unit ?? "")}` : e.kind === "milestone_achieved" ? `milestone ${p.name} behaald` : e.kind === "comment" ? `reageerde: “${String(p.body).slice(0, 60)}”` : e.kind === "kpi_checkin" ? `check-in ${p.name}: ${fmtValue(Number(p.value), "")}` : e.kind === "goal_created" ? "maakte een doel aan" : e.kind === "goal_achieved" ? "doel behaald" : e.kind === "status_change" ? `status → ${p.to}` : "toewijzing";
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 text-xs">
                      {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="xs" /> : <span className="size-6 rounded-full bg-ink-deep border border-line shrink-0" aria-hidden />}
                      <span className="min-w-0">
                        <span className="block text-ice-dim"><span className="font-semibold text-ice">{actor?.full_name.split(" ")[0] ?? "Systeem"}</span> {text}</span>
                        <span className="block text-muted truncate">{goal ? <Link href={`/goals/${goal.id}`} className="hover:text-ice">{goal.title}</Link> : ""} · {fmtRelative(e.created_at)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
