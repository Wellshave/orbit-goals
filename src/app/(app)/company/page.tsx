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
import { dfLocale } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import type { ActivityEvent, Status } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("company.title") };
}

export default async function CompanyPage({ searchParams }: PageProps<"/company">) {
  const sp = await searchParams;
  const { supabase, org, isAdmin, locale, t } = await getSession();
  const period = resolvePeriod(sp, "quarter", locale);
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

  let bars: { label: string; value: number | null }[] = [];
  if (bundle && bundle.goal.measure === "numeric") {
    const g = bundle.goal;
    const months = eachMonthOfInterval({ start: parseISO(g.start_date), end: parseISO(g.deadline) });
    const now = new Date();
    let prevVal = g.start_value;
    bars = months.map((m) => {
      const endOfM = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      if (m > now) return { label: format(m, "MMM", { locale: dfLocale(locale) }), value: null };
      const v = Number(valueAt(g, bundle.updates, endOfM <= now ? endOfM : now));
      const inc = v - prevVal; prevVal = v;
      return { label: format(m, "MMM", { locale: dfLocale(locale) }), value: Math.max(0, inc) };
    });
  }
  const teamTotals = dir.teams.map((tm) => { const ids = dir.membersOf(tm.id).map((m) => m.id); return { team: tm, points: scoreRows.filter((r) => ids.includes(r.profile_id)).reduce((s, r) => s + r.total, 0) }; }).sort((a, b) => b.points - a.points);
  const events = (eventsRes.data ?? []) as ActivityEvent[];
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const contributors = bundle ? Array.from(new Set(bundle.updates.slice(0, 3).map((u) => u.profile_id))).map((id) => dir.byId.get(id)!).filter(Boolean) : [];
  const pw = period.short.toLowerCase();

  return (
    <div className="flex flex-col gap-10 pt-2">
      <PageHeader help="company" icon="company" tone="yellow" eyebrow={org.name} title={t("company.heading")} description={t("company.sub")} actions={isAdmin ? <ButtonLink href="/goals/new" size="sm">{t("company.createGoal")}</ButtonLink> : undefined}>
        <PeriodBar current={period.key} label={period.label} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="company-tiles">
        <Tile icon="trend" tone="blue" label={t("company.avgProgress")} value={pct(avgProgress)} sub={t("company.activeGoals", { n: activeGoals.length })} />
        <Tile icon="flag" tone="yellow" label={t("company.milestones", { p: pw })} value={achievedMs.length} sub={t("company.achievedTogether")} />
        <Tile icon="rocket" tone="coral" label={t("company.needsAttention")} value={atRisk.length} sub={atRisk.length ? t("company.behindOrAlmost") : t("company.allOnCourse")} />
        <Tile icon="collab" tone="mint" label={t("company.activeContributors")} value={`${scoreRows.length}/${dir.members.length}`} sub={t("company.tookPart")} />
      </div>

      {bundle ? (
        <section className="card-lift p-6 sm:p-8" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FFF6E1 100%)" }} aria-labelledby="featured-title" data-tour="featured-goal">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <ClayIcon name="rocket" tone="yellow" size="md" />
            <p className="t-label">{t("company.bigGoal")}</p>
            <StatusPill status={bundle.goal.status} progress={goalProgress(bundle.goal)} size="xs" />
          </div>
          <h2 id="featured-title" className="text-3xl sm:text-4xl"><Link href={`/goals/${bundle.goal.id}`} className="hover:text-blue-deep">{bundle.goal.title}</Link></h2>
          <p className="mt-2 text-lg text-ink-2">{progressLabel(t, bundle.goal)} · {explainGoal(t, locale, bundle.goal)}{explainForecast(t, locale, bundle.goal) ? ` ${explainForecast(t, locale, bundle.goal)}` : ""}</p>
          <div className="mt-6"><ProgressPath goal={bundle.goal} milestones={bundle.milestones} rewards={bundle.rewards} contributors={contributors} lastUpdateAt={bundle.updates[0]?.created_at ?? null} accent="#F6C85F" /></div>
          {bars.length > 1 && (
            <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-6 items-end">
              <div><p className="t-label mb-2">{t("company.perMonth")}</p><BarChart data={bars} accent="#F6C85F" height={110} label={t("company.perMonth")} /></div>
              <div className="lg:max-w-md"><p className="t-label mb-2">{t("company.milestonesRewards")}</p><MilestoneBadges goal={bundle.goal} milestones={bundle.milestones} rewards={bundle.rewards} t={t} locale={locale} /></div>
            </div>
          )}
        </section>
      ) : (
        <EmptyState icon="company" tone="yellow" title={t("company.noGoal")} body={t("company.noGoalBody")} action={isAdmin ? <ButtonLink href="/goals/new" size="sm">{t("company.createGoal")}</ButtonLink> : undefined} />
      )}

      <section>
        <SectionHeading title={t("company.companyGoals")} sub={t("company.companyGoalsSub")} actions={<Link href="/goals?type=company" className="text-sm font-semibold text-blue-deep hover:underline">{t("company.allGoals")}</Link>} />
        {company.length === 0 ? <p className="text-sm t-muted">{t("company.noCompanyGoals")}</p> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{company.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} owner={dir.byId.get(g.owner_id)} />)}</div>}
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <div data-tour="company-kpis"><Panel eyebrow={t("company.kpis")} title={t("company.kpisTitle")} help="kpis">
            {kpiViews.length === 0 ? <p className="text-sm t-muted">{t("company.noKpis")}</p> : (
              <ul className="divide-y divide-line">
                {kpiViews.map((v) => (
                  <li key={v.kpi.id} className="py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <ClayIcon name="kpi" tone={STATUS_META[v.status].tone} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/kpis/${v.kpi.id}`} className="font-bold text-sm hover:text-blue-deep block truncate">{v.kpi.name}</Link>
                      <p className="text-xs t-muted truncate">{explainKpi(t, v)} · {v.assignees.map((id) => dir.byId.get(id)?.full_name.split(" ")[0]).filter(Boolean).join(", ") || t("company.teamWord")}</p>
                      <div className="mt-1.5 max-w-xs"><RatioBar ratio={v.ratio} tone={STATUS_META[v.status].tone} /></div>
                    </div>
                    <span className="text-right"><span className="block font-display font-extrabold">{fmtValue(v.value, v.kpi.unit)}</span><span className="text-xs t-muted">{t("common.of")} {fmtValue(v.kpi.target_value, v.kpi.unit)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Panel></div>
          <Panel eyebrow={t("company.contributions")} title={t("company.whoMadeDifference")} help="scoreboard" actions={<Link href="/scoreboard" className="text-sm font-semibold text-blue-deep hover:underline">{t("nav.scoreboard")}</Link>}>
            <div className="grid md:grid-cols-2 gap-6">
              <ol className="flex flex-col gap-2">
                {scoreRows.slice(0, 5).map((r, i) => { const p = dir.byId.get(r.profile_id); if (!p) return null; return (
                  <li key={r.profile_id} className="flex items-center gap-3 text-sm"><span className="font-display font-extrabold t-muted w-4">{i + 1}</span><Avatar name={p.full_name} src={p.avatar_url} size="sm" ring /><span className="flex-1 truncate font-semibold">{p.full_name}</span><span className="font-bold tnum">{r.total}</span></li>
                ); })}
                {scoreRows.length === 0 && <li className="text-sm t-muted">{t("company.noContrib")}</li>}
              </ol>
              <ol className="flex flex-col gap-3">
                {teamTotals.map((tm) => (
                  <li key={tm.team.id} className="text-sm">
                    <div className="flex items-center justify-between"><Link href={`/teams/${tm.team.id}`} className="font-semibold hover:text-blue-deep flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: tm.team.color }} aria-hidden />{tm.team.name}</Link><span className="font-bold tnum">{tm.points}</span></div>
                    <div className="h-2 rounded-full bg-cloud overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${teamTotals[0]?.points ? (tm.points / teamTotals[0].points) * 100 : 0}%`, background: tm.team.color }} /></div>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <div data-tour="company-attention"><Panel eyebrow={t("company.attentionEyebrow")} title={t("company.couldUseHelp")} tone="peach" help="status">
            {atRisk.length === 0 ? <p className="text-sm t-muted">{t("company.noBehind")}</p> : <div className="bg-white/70 rounded-2xl divide-y divide-line">{atRisk.slice(0, 5).map((g) => <GoalRow key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} />)}</div>}
          </Panel></div>
          <Panel eyebrow={period.label} title={t("company.achievedMs")} tone="butter" help="milestones">
            {achievedMs.length === 0 ? <p className="text-sm t-muted">{t("company.noMs")}</p> : (
              <ul className="flex flex-col gap-2">
                {achievedMs.slice(0, 6).map((m) => { const g = goals.find((x) => x.id === m.goal_id)!; return (
                  <li key={m.id}><Link href={`/goals/${g.id}?celebrate=${m.id}`} className="press flex items-start gap-3 rounded-2xl bg-white/80 p-3 hover:bg-white"><ClayIcon name="flag" tone="yellow" size="sm" /><span className="min-w-0"><span className="block font-bold text-sm truncate">{m.name}</span><span className="block text-xs t-muted truncate">{g.title} · {fmtDate(m.achieved_at, "d MMM yyyy", locale)}</span></span></Link></li>
                ); })}
              </ul>
            )}
          </Panel>
          <Panel eyebrow={t("company.live")} title={t("company.activity")}>
            {events.length === 0 ? <p className="text-sm t-muted">{t("company.noActivityPeriod")}</p> : (
              <ul className="flex flex-col gap-3">
                {events.slice(0, 8).map((e) => {
                  const actor = e.actor_id ? dir.byId.get(e.actor_id) : null;
                  const p = e.payload as Record<string, string | number>;
                  const goal = e.goal_id ? goals.find((g) => g.id === e.goal_id) : null;
                  const text = e.kind === "goal_update" ? t("company.evProgress", { v: fmtValue(Number(p.new), goal?.unit ?? "") }) : e.kind === "milestone_achieved" ? t("company.evMilestone", { m: String(p.name) }) : e.kind === "comment" ? `“${String(p.body).slice(0, 50)}”` : e.kind === "kpi_checkin" ? t("company.evCheckin", { k: String(p.name), v: fmtValue(Number(p.value), "") }) : e.kind === "goal_created" ? t("company.evCreated") : e.kind === "goal_achieved" ? t("company.evAchieved") : e.kind === "status_change" ? t("company.evStatus", { s: t(`status.${p.to as Status}`) }) : t("company.evAssign");
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 text-sm">
                      {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="sm" ring /> : <span className="size-8 rounded-full bg-cloud shrink-0" aria-hidden />}
                      <span className="min-w-0"><span className="block"><span className="font-bold">{actor?.full_name.split(" ")[0] ?? t("company.system")}</span> {text}</span><span className="block text-xs t-muted truncate">{goal ? <Link href={`/goals/${goal.id}`} className="hover:text-ink">{goal.title}</Link> : ""} · {fmtRelative(e.created_at, locale)}</span></span>
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
