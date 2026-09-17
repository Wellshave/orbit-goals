import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, previousPeriod, periodLabel } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { GoalCard, GoalRow } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { ProgressPath } from "@/components/instruments/progress-path";
import { Panel, SectionHeading, EmptyState, ButtonLink, Avatar, Chip } from "@/components/ui";
import { ClayIcon, } from "@/components/icons";
import { goalVisual } from "@/lib/goals/formats";
import { HelpButton } from "@/components/help/help-button";
import { STATUS_ORDER, goalProgress, milestonePosition } from "@/lib/status";
import { explainMilestone, greeting, nextMilestone } from "@/lib/explain";
import { fmtRelative, fmtValue } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { ActivityEvent, SavedFilter } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("dashboard.title") };
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const { supabase, profile, org, locale, t, isAdmin } = await getSession();
  const period = resolvePeriod(sp, "week", locale);
  const prev = previousPeriod(period);
  const dir = await getDirectory();

  const [goals, kpis, filtersRes, scoreRows, eventsRes] = await Promise.all([
    listGoals(supabase, org.id), listKpis(supabase, org.id),
    supabase.from("saved_filters").select("*").eq("profile_id", profile.id).order("created_at"),
    getScoreboard(supabase, period.from, period.to),
    supabase.from("activity_events").select("*").eq("org_id", org.id).in("kind", ["goal_update", "milestone_achieved", "comment", "goal_achieved"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const goalIds = goals.map((g) => g.id);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([
    listAssignments(supabase, goalIds), listMilestones(supabase, goalIds), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { from: new Date(prev.from.getTime() - 1000 * 3600 * 24 * 200) }),
  ]);

  const mine = goals.filter((g) => g.owner_id === profile.id || assignments.some((a) => a.goal_id === g.id && a.profile_id === profile.id));
  const personal = mine.filter((g) => g.goal_type === "personal");
  const attention = [...mine].filter((g) => g.status === "behind" || g.status === "needs_attention").sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const goingWell = mine.filter((g) => g.status === "on_track" || g.status === "achieved");
  // "Jouw KPI's" = alleen waar je zelf aan toegewezen bent (of een eigen KPI zonder toewijzingen).
  // KPI's die je voor anderen beheert horen hier niet: die staan voor beheerders in een apart teamoverzicht.
  const myKpis = kpis.filter((k) => kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === profile.id) || (k.owner_id === profile.id && !kpiAssignments.some((a) => a.kpi_id === k.id)));
  const views = myKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period, profile.id));
  const teamKpiViews = isAdmin ? kpis.filter((k) => !myKpis.includes(k)).map((k) => buildKpiView(k, kpiAssignments, checkins, period, k.scope === "personal" ? kpiAssignments.find((a) => a.kpi_id === k.id)?.profile_id ?? k.owner_id ?? undefined : undefined)) : [];
  const openCheckins = views.filter((v) => !v.openPeriod.done && kpiAssignments.some((a) => a.kpi_id === v.kpi.id && a.profile_id === profile.id));

  const nearMilestones = goals.flatMap((g) => {
    const m = nextMilestone(g, milestones.filter((x) => x.goal_id === g.id));
    if (!m || g.measure === "binary") return [];
    const pos = milestonePosition(g, m.target_value);
    const frac = pos > 0 ? Math.min(1, goalProgress(g) / pos) : 0;
    return frac >= 0.75 ? [{ goal: g, milestone: m, frac }] : [];
  }).sort((a, b) => b.frac - a.frac).slice(0, 4);

  const featured = mine.find((g) => g.is_featured) ?? mine.find((g) => g.goal_type === "company") ?? mine[0] ?? goals[0];
  const myScore = scoreRows.find((r) => r.profile_id === profile.id);
  const events = (eventsRes.data ?? []) as ActivityEvent[];
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const n = openCheckins.length;
  const primary = n > 0 ? { href: "/checkin", label: n === 1 ? t("dashboard.fillCheckinOne") : t("dashboard.fillCheckinMany", { n }) } : attention[0] ? { href: `/goals/${attention[0].id}#voortgang`, label: t("dashboard.updateProgress") } : { href: "/goals/new", label: t("dashboard.newGoal") };
  const a = attention.length;
  const summary = n > 0
    ? `${n === 1 ? t("dashboard.summaryCheckinsOne") : t("dashboard.summaryCheckinsMany", { n })}${a ? (a === 1 ? t("dashboard.andAttentionOne") : t("dashboard.andAttentionMany", { n: a })) : ""}.`
    : a ? (a === 1 ? t("dashboard.summaryAttentionOne") : t("dashboard.summaryAttentionMany", { n: a })) : goingWell.length ? t("dashboard.summaryGood") : t("dashboard.summaryEmpty");
  const pw = period.short.toLowerCase();

  return (
    <div className="flex flex-col gap-10 pt-2">
      <section className="relative overflow-hidden card-lift p-6 sm:p-8" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 55%, #E6FBF4 100%)" }} aria-labelledby="hero-title" data-tour="hero">
        <div className="absolute right-4 top-4 z-10"><HelpButton topic="dashboard" label="page" /></div>
        <div className="grid xl:grid-cols-[1fr_minmax(0,440px)] gap-8 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" ring />
              <div>
                <p className="t-label">{period.label}</p>
                <h1 id="hero-title" className="text-3xl sm:text-4xl leading-tight">{t("dashboard.greetingTitle", { greeting: greeting(t, profile.full_name) })}</h1>
              </div>
            </div>
            <p className="mt-4 text-lg text-ink-2 max-w-xl">{summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span data-tour="primary-action"><ButtonLink href={primary.href} size="lg">{primary.label} <ArrowRight className="size-4" aria-hidden /></ButtonLink></span>
              {myScore && <Chip tone="yellow" className="!py-1.5 !px-3 !text-sm">{t("dashboard.pointsThis", { n: myScore.total, p: pw })}</Chip>}
            </div>
          </div>
          {featured && (
            <div className="min-w-0">
              <p className="t-label mb-1 flex items-center gap-2"><ClayIcon name={goalVisual(featured).name} tone={goalVisual(featured).tone} size="sm" /> {featured.title}</p>
              <ProgressPath goal={featured} milestones={milestones.filter((m) => m.goal_id === featured.id)} contributors={peopleOf(featured.id).slice(0, 3)} compact href={`/goals/${featured.id}`} accent={featured.goal_type === "team" && featured.team_id ? dir.teamById.get(featured.team_id)?.color : featured.goal_type === "company" ? "#F6C85F" : "#48CFAE"} />
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <PeriodBar current={period.key} label={period.label} />
        <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
      </div>

      <section aria-labelledby="todo" data-tour="todo">
        <SectionHeading help="checkin" title={<span id="todo">{t("dashboard.todo")}</span>} sub={n ? (n === 1 ? t("dashboard.todoSubOne") : t("dashboard.todoSubMany", { n })) : t("dashboard.todoDone")} actions={n > 2 ? <Link href="/checkin" className="text-sm font-semibold text-blue-deep hover:underline">{t("dashboard.allCheckins")}</Link> : undefined} />
        {n === 0 ? (
          <div className="tile soft-mint p-5 flex items-center gap-4"><ClayIcon name="check" tone="mint" size="lg" className="bg-white" /><div><p className="font-display font-extrabold text-lg">{t("dashboard.nothingOpen")}</p><p className="text-sm t-muted">{t("dashboard.nothingOpenSub")}</p></div></div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {openCheckins.slice(0, 4).map((v) => (
              <li key={v.kpi.id} className="card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <ClayIcon name="kpi" tone="mint" size="md" />
                  <div className="min-w-0"><p className="font-display font-extrabold leading-tight">{v.kpi.name}</p><p className="text-xs t-muted mt-0.5">{periodLabel(v.kpi.frequency, v.openPeriod.start, locale)} · {t("common.target")} {fmtValue(v.kpi.target_value, v.kpi.unit)}{v.previous !== null ? ` · ${t("dashboard.previous", { v: fmtValue(v.previous, v.kpi.unit) })}` : ""}</p></div>
                </div>
                <CheckinForm kpi={v.kpi} period={v.openPeriod} compact />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="attention" data-tour="attention">
        <SectionHeading help="status" title={<span id="attention">{t("dashboard.attention")}</span>} sub={a ? t("dashboard.attentionSub") : t("dashboard.attentionNone")} />
        {a > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {attention.slice(0, 3).map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} owner={dir.byId.get(g.owner_id)} action="update" />)}
          </div>
        ) : goingWell.length > 0 ? (
          <div className="card p-2 divide-y divide-line">{goingWell.slice(0, 3).map((g) => <GoalRow key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} />)}</div>
        ) : (
          <EmptyState compact icon="rocket" tone="coral" title={t("dashboard.noGoals")} body={t("dashboard.noGoalsBody")} action={<ButtonLink href="/goals/new" size="sm">{t("dashboard.firstGoal")}</ButtonLink>} />
        )}
      </section>

      <section aria-labelledby="kpis" data-tour="kpis">
        <SectionHeading help="kpis" title={<span id="kpis">{t("dashboard.kpisTitle", { p: pw })}</span>} sub={views.length ? t("dashboard.kpisSub", { a: views.filter((v) => v.status === "achieved").length, b: views.length }) : undefined} actions={<Link href="/kpis" className="text-sm font-semibold text-blue-deep hover:underline">{t("dashboard.allKpis")}</Link>} />
        {views.length === 0 ? (
          <EmptyState compact icon="kpi" title={t("dashboard.noKpis")} body={t("dashboard.noKpisBody")} action={<ButtonLink href="/kpis/new" size="sm" variant="secondary">{t("dashboard.personalKpi")}</ButtonLink>} />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{views.slice(0, 6).map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} />)}</div>
        )}
      </section>

      {isAdmin && teamKpiViews.length > 0 && (
        <section aria-labelledby="team-kpis">
          <SectionHeading help="kpis" title={<span id="team-kpis">{t("dashboard.teamKpisTitle")}</span>} sub={t("dashboard.teamKpisSub", { a: teamKpiViews.filter((v) => v.status === "achieved").length, b: teamKpiViews.length })} actions={<Link href="/kpis" className="text-sm font-semibold text-blue-deep hover:underline">{t("dashboard.allKpis")}</Link>} />
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{teamKpiViews.slice(0, 6).map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} showCheckin={false} />)}</div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div data-tour="milestones-near"><Panel eyebrow={t("dashboard.almostThere")} title={t("dashboard.milestonesClose")} tone="butter" help="milestones">
          {nearMilestones.length === 0 ? <p className="text-sm t-muted">{t("dashboard.milestonesNone")}</p> : (
            <ul className="flex flex-col gap-3">
              {nearMilestones.map(({ goal, milestone, frac }) => (
                <li key={milestone.id}>
                  <Link href={`/goals/${goal.id}`} className="press flex items-center gap-3 rounded-2xl bg-white/80 p-3 hover:bg-white">
                    <ClayIcon name="flag" tone="yellow" size="md" />
                    <span className="min-w-0 flex-1"><span className="block font-bold text-sm truncate">{milestone.name} · {goal.title}</span><span className="block text-xs t-muted">{explainMilestone(t, goal, milestone)}</span><span className="block mt-1.5 h-2 rounded-full bg-cloud overflow-hidden"><span className="block h-full rounded-full bg-yellow" style={{ width: `${frac * 100}%` }} /></span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel></div>

        <Panel eyebrow={t("dashboard.together")} title={t("dashboard.teamSteps")} actions={<Link href="/company" className="text-sm font-semibold text-blue-deep hover:underline">{t("nav.company")}</Link>}>
          {events.length === 0 ? <p className="text-sm t-muted">{t("dashboard.noActivity")}</p> : (
            <ul className="flex flex-col gap-3">
              {events.slice(0, 6).map((e) => {
                const actor = e.actor_id ? dir.byId.get(e.actor_id) : null;
                const p = e.payload as Record<string, string | number>;
                const goal = e.goal_id ? goals.find((g) => g.id === e.goal_id) : null;
                const text = e.kind === "goal_update" ? t("dashboard.evGoalUpdate", { g: goal?.title ?? "", v: fmtValue(Number(p.new), goal?.unit ?? "") }) : e.kind === "milestone_achieved" ? t("dashboard.evMilestone", { m: String(p.name) }) : e.kind === "goal_achieved" ? t("dashboard.evGoalDone", { g: goal?.title ?? "" }) : t("dashboard.evComment", { c: String(p.body).slice(0, 60) });
                return (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="sm" ring /> : <span className="size-8 rounded-full bg-cloud shrink-0" aria-hidden />}
                    <span className="min-w-0"><span className="block"><span className="font-bold">{actor?.full_name.split(" ")[0] ?? t("dashboard.someone")}</span> {text}</span><span className="block text-xs t-muted">{goal ? <Link href={`/goals/${goal.id}`} className="hover:text-ink">{goal.title}</Link> : ""} · {fmtRelative(e.created_at, locale)}</span></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <section aria-labelledby="personal">
        <SectionHeading help="visibility" title={<span id="personal">{t("dashboard.personalGoals")}</span>} sub={t("dashboard.personalSub")} actions={<ButtonLink href="/goals/new" size="sm" variant="secondary">{t("dashboard.newGoalShort")}</ButtonLink>} />
        {personal.length === 0 ? <EmptyState compact icon="person" tone="mint" title={t("dashboard.noPersonal")} body={t("dashboard.noPersonalBody")} action={<ButtonLink href="/goals/new" size="sm">{t("dashboard.createPersonal")}</ButtonLink>} /> : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{personal.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} owner={profile} compact />)}</div>
        )}
      </section>
    </div>
  );
}
