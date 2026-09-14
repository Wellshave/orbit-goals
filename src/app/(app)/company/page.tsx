import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getGoalBundle, listAssignments, listGoals, listMilestones, valueAt } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { ProgressPath } from "@/components/instruments/progress-path";
import { BarChart } from "@/components/instruments/mini-bars";
import { MilestoneBadges } from "@/components/instruments/milestone-track";
import { GoalCard, GoalRow } from "@/components/goals/goal-card";
import { Panel, SectionHeading, Tile, StatusPill, Avatar, EmptyState, ButtonLink } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { RatioBar } from "@/components/instruments/progress-bar";
import { goalProgress, STATUS_ORDER, STATUS_META } from "@/lib/status";
import { explainForecast, explainGoal, explainKpi, progressLabel } from "@/lib/explain";
import { fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { format, eachMonthOfInterval, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { ActivityEvent } from "@/lib/types";

export const metadata = { title: "Bedrijf" };

export default async function CompanyPage({ searchParams }: PageProps<"/company">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "quarter");
  const { supabase, org, isAdmin } = await getSession();
  const dir = await getDirectory();
  const [goals, kpis, scoreRows, eventsRes] = await Promise.all([
    listGoals(supabase, org.id), listKpis(supabase, org.id), getScoreboard(supabase, period.from, period.to),
    supabase.from("activity_events").select("*").eq("org_id", org.id).gte("created_at", period.from.toISOString()).lt("created_at", period.to.toISOString()).order("created_at", { ascending: false }).limit(20),
  ]);
  const goalIds = goals.map((g) => g.id);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([listAssignments(supabase, goalIds), listMilestones(supabase, goalIds), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 600 })]);

  const company = goals.filter((g) => g.goal_type === "company");
  const featured = company.find((g) => g.is_featured) ?? company[0] ?? goals[0];
  const bundle = featured ? await getGoalBundle(supabase, featured.id) : null;
  const activeGoals = goals.filter((g) => g.status !== "achieved");
  const avgProgress = activeGoals.length ? activeGoals.reduce((s, g) => s + Math.min(1, goalProgress(g)), 0) / activeGoals.length : 0;
  const atRisk = goals.filter((g) => g.status === "behind" || g.status === "needs_attention").sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const achievedMs = milestones.filter((m) => m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to);
  const kpiViews = kpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period)).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)).slice(0, 8);

  // Maandelijkse toename van het uitgelichte doel (geen lijngrafiek, gewoon balkjes)
  let bars: { label: string; value: number | null }[] = [];
  if (bundle && bundle.goal.measure === "numeric") {
    const g = bundle.goal;
    const months = eachMonthOfInterval({ start: parseISO(g.start_date), end: parseISO(g.deadline) });
    const now = new Date();
    let prevVal = g.start_value;
    bars = months.map((m) => {
      const endOfM = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      if (m > now) return { label: format(m, "MMM", { locale: nl }), value: null };
      const v = Number(valueAt(g, bundle.updates, endOfM <= now ? endOfM : now));
      const inc = v - prevVal; prevVal = v;
      return { label: format(m, "MMM", { locale: nl }), value: Math.max(0, inc) };
    });
  }
  const teamTotals = dir.teams.map((t) => { const ids = dir.membersOf(t.id).map((m) => m.id); return { team: t, points: scoreRows.filter((r) => ids.includes(r.profile_id)).reduce((s, r) => s + r.total, 0) }; }).sort((a, b) => b.points - a.points);
  const events = (eventsRes.data ?? []) as ActivityEvent[];
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const contributors = bundle ? Array.from(new Set(bundle.updates.slice(0, 3).map((u) => u.profile_id))).map((id) => dir.byId.get(id)!).filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-10 pt-2">
      <PageHeader icon="company" tone="yellow" eyebrow={org.name} title="Hoe het bedrijf ervoor staat" description="De grote doelen, wat aandacht vraagt en wie deze periode het verschil maakte." actions={isAdmin ? <ButtonLink href="/goals/new" size="sm">Bedrijfsdoel aanmaken</ButtonLink> : undefined}>
        <PeriodBar current={period.key} label={period.label} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon="trend" tone="blue" label="Gemiddelde voortgang" value={pct(avgProgress)} sub={`${activeGoals.length} actieve doelen`} />
        <Tile icon="flag" tone="yellow" label={`Milestones · ${period.short.toLowerCase()}`} value={achievedMs.length} sub="samen behaald" />
        <Tile icon="rocket" tone="coral" label="Vraagt aandacht" value={atRisk.length} sub={atRisk.length ? "doelen achter of bijna" : "alles op koers"} />
        <Tile icon="collab" tone="mint" label="Actieve bijdragers" value={`${scoreRows.length}/${dir.members.length}`} sub="deden mee deze periode" />
      </div>

      {bundle ? (
        <section className="card-lift p-6 sm:p-8" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FFF6E1 100%)" }} aria-labelledby="featured-title">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <ClayIcon name="rocket" tone="yellow" size="md" />
            <p className="t-label">Het grote doel</p>
            <StatusPill status={bundle.goal.status} progress={goalProgress(bundle.goal)} size="xs" />
          </div>
          <h2 id="featured-title" className="text-3xl sm:text-4xl"><Link href={`/goals/${bundle.goal.id}`} className="hover:text-blue-deep">{bundle.goal.title}</Link></h2>
          <p className="mt-2 text-lg text-ink-2">{progressLabel(bundle.goal)} · {explainGoal(bundle.goal)}{explainForecast(bundle.goal) ? ` ${explainForecast(bundle.goal)}` : ""}</p>
          <div className="mt-6"><ProgressPath goal={bundle.goal} milestones={bundle.milestones} rewards={bundle.rewards} contributors={contributors} lastUpdateAt={bundle.updates[0]?.created_at ?? null} accent="#F6C85F" /></div>
          {bars.length > 1 && (
            <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-6 items-end">
              <div><p className="t-label mb-2">Toename per maand</p><BarChart data={bars} accent="#F6C85F" height={110} /></div>
              <div className="lg:max-w-md"><p className="t-label mb-2">Milestones en rewards</p><MilestoneBadges goal={bundle.goal} milestones={bundle.milestones} rewards={bundle.rewards} /></div>
            </div>
          )}
        </section>
      ) : (
        <EmptyState icon="company" tone="yellow" title="Nog geen bedrijfsdoel" body="Maak het eerste bedrijfsdoel aan; het verschijnt hier als Progress Path." action={isAdmin ? <ButtonLink href="/goals/new" size="sm">Bedrijfsdoel aanmaken</ButtonLink> : undefined} />
      )}

      <section>
        <SectionHeading title="Bedrijfsdoelen" sub="Iedereen in de organisatie werkt hieraan mee." actions={<Link href="/goals?type=company" className="text-sm font-semibold text-blue-deep hover:underline">Alle doelen</Link>} />
        {company.length === 0 ? <p className="text-sm t-muted">Nog geen bedrijfsdoelen.</p> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{company.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} owner={dir.byId.get(g.owner_id)} />)}</div>}
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="KPI's" title="Hoe de KPI's ervoor staan">
            {kpiViews.length === 0 ? <p className="text-sm t-muted">Nog geen KPI&apos;s.</p> : (
              <ul className="divide-y divide-line">
                {kpiViews.map((v) => (
                  <li key={v.kpi.id} className="py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <ClayIcon name="kpi" tone={STATUS_META[v.status].tone} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/kpis/${v.kpi.id}`} className="font-bold text-sm hover:text-blue-deep block truncate">{v.kpi.name}</Link>
                      <p className="text-xs t-muted truncate">{explainKpi(v)} · {v.assignees.map((id) => dir.byId.get(id)?.full_name.split(" ")[0]).filter(Boolean).join(", ") || "team"}</p>
                      <div className="mt-1.5 max-w-xs"><RatioBar ratio={v.ratio} tone={STATUS_META[v.status].tone} /></div>
                    </div>
                    <span className="text-right"><span className="block font-display font-extrabold">{fmtValue(v.value, v.kpi.unit)}</span><span className="text-xs t-muted">van {fmtValue(v.kpi.target_value, v.kpi.unit)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Bijdragen" title="Wie het verschil maakte" actions={<Link href="/scoreboard" className="text-sm font-semibold text-blue-deep hover:underline">Scorebord</Link>}>
            <div className="grid md:grid-cols-2 gap-6">
              <ol className="flex flex-col gap-2">
                {scoreRows.slice(0, 5).map((r, i) => { const p = dir.byId.get(r.profile_id); if (!p) return null; return (
                  <li key={r.profile_id} className="flex items-center gap-3 text-sm"><span className="font-display font-extrabold t-muted w-4">{i + 1}</span><Avatar name={p.full_name} src={p.avatar_url} size="sm" ring /><span className="flex-1 truncate font-semibold">{p.full_name}</span><span className="font-bold tnum">{r.total}</span></li>
                ); })}
                {scoreRows.length === 0 && <li className="text-sm t-muted">Nog geen bijdragen.</li>}
              </ol>
              <ol className="flex flex-col gap-3">
                {teamTotals.map((t) => (
                  <li key={t.team.id} className="text-sm">
                    <div className="flex items-center justify-between"><Link href={`/teams/${t.team.id}`} className="font-semibold hover:text-blue-deep flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: t.team.color }} aria-hidden />{t.team.name}</Link><span className="font-bold tnum">{t.points}</span></div>
                    <div className="h-2 rounded-full bg-cloud overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${teamTotals[0]?.points ? (t.points / teamTotals[0].points) * 100 : 0}%`, background: t.team.color }} /></div>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Aandacht" title="Doelen die hulp kunnen gebruiken" tone="peach">
            {atRisk.length === 0 ? <p className="text-sm t-muted">Geen doelen achter. Mooi werk allemaal.</p> : <div className="bg-white/70 rounded-2xl divide-y divide-line">{atRisk.slice(0, 5).map((g) => <GoalRow key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} />)}</div>}
          </Panel>
          <Panel eyebrow={period.label} title="Behaalde milestones" tone="butter">
            {achievedMs.length === 0 ? <p className="text-sm t-muted">Nog geen milestones in deze periode.</p> : (
              <ul className="flex flex-col gap-2">
                {achievedMs.slice(0, 6).map((m) => { const g = goals.find((x) => x.id === m.goal_id)!; return (
                  <li key={m.id}><Link href={`/goals/${g.id}?celebrate=${m.id}`} className="press flex items-start gap-3 rounded-2xl bg-white/80 p-3 hover:bg-white"><ClayIcon name="flag" tone="yellow" size="sm" /><span className="min-w-0"><span className="block font-bold text-sm truncate">{m.name}</span><span className="block text-xs t-muted truncate">{g.title} · {fmtDate(m.achieved_at)}</span></span></Link></li>
                ); })}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Live" title="Teamactiviteit">
            {events.length === 0 ? <p className="text-sm t-muted">Geen activiteit in deze periode.</p> : (
              <ul className="flex flex-col gap-3">
                {events.slice(0, 8).map((e) => {
                  const actor = e.actor_id ? dir.byId.get(e.actor_id) : null;
                  const p = e.payload as Record<string, string | number>;
                  const goal = e.goal_id ? goals.find((g) => g.id === e.goal_id) : null;
                  const text = e.kind === "goal_update" ? `voortgang naar ${fmtValue(Number(p.new), goal?.unit ?? "")}` : e.kind === "milestone_achieved" ? `milestone ${p.name} behaald` : e.kind === "comment" ? `“${String(p.body).slice(0, 50)}”` : e.kind === "kpi_checkin" ? `check-in ${p.name}: ${fmtValue(Number(p.value), "")}` : e.kind === "goal_created" ? "maakte een doel aan" : e.kind === "goal_achieved" ? "doel behaald" : e.kind === "status_change" ? `status → ${STATUS_META[p.to as keyof typeof STATUS_META]?.label ?? p.to}` : "toewijzing";
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 text-sm">
                      {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="sm" ring /> : <span className="size-8 rounded-full bg-cloud shrink-0" aria-hidden />}
                      <span className="min-w-0"><span className="block"><span className="font-bold">{actor?.full_name.split(" ")[0] ?? "Systeem"}</span> {text}</span><span className="block text-xs t-muted truncate">{goal ? <Link href={`/goals/${goal.id}`} className="hover:text-ink">{goal.title}</Link> : ""} · {fmtRelative(e.created_at)}</span></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
