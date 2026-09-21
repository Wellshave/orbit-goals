import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BarChart3, Flag, Gauge, Hand, Heart, MessageCircle, Pencil, Plus, Trophy } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { previousPeriod, resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { getPersonOverview } from "@/lib/data/person";
import { PeriodBar } from "@/components/shell/period-bar";
import { ProgressPath } from "@/components/instruments/progress-path";
import { Avatar, AvatarStack, ButtonLink, StatusPill } from "@/components/ui";
import { ClayIcon, TONE_STYLE } from "@/components/icons";
import { HelpButton } from "@/components/help/help-button";
import { effectiveFormat, goalVisual } from "@/lib/goals/formats";
import { STATUS_ORDER, goalProgress } from "@/lib/status";
import { explainMilestone, milestoneDistance, progressLabel } from "@/lib/explain";
import { clamp, fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { sendKudos } from "@/app/actions/misc";
import type { Goal, Profile } from "@/lib/types";
import type { T } from "@/lib/i18n";
import { HeaderMenu, Parallax } from "./dashboard-client";
import { ActivityTimeline, GoalJourneyRow, KpiRows, MomentumRibbon, NextActions, TeamLane, accentOf, type NextAction, type RibbonSegment } from "./dashboard-parts";

/** Sectiekop met vaste baseline, zodat alle zones op dezelfde lijn beginnen. */
function ZoneTitle({ id, title, sub, action }: { id?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 id={id} className="text-xl leading-tight">{title}</h2>
        {sub && <p className="text-sm t-muted mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function greetingFor(t: T, name: string) {
  const h = new Date().getHours();
  const key = h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `${t(`explain.${key}`)}, ${name.split(" ")[0]}`;
}

/**
 * Persoonlijk dashboard (gedeeld door /me en /people/[id]).
 * Eén taak: in een paar seconden laten zien waar iemand staat, wat aandacht vraagt en wat de volgende stap is.
 * Leesroute: header → Momentum Ribbon → focus + eerstvolgende stap → mijn voortgang → team + activiteit → KPI's.
 */
export async function PersonDashboard({ personId: id, sp }: { personId: string; sp: Record<string, string | string[] | undefined> }) {
  const { supabase, org, profile, locale, t } = await getSession();
  const period = resolvePeriod(sp, "month", locale);
  const prev = previousPeriod(period);
  const dir = await getDirectory();
  const person = dir.byId.get(id);
  if (!person) notFound();
  const me = person.id === profile.id;
  const first = person.full_name.split(" ")[0];

  const [ov, rows, prevRows] = await Promise.all([
    getPersonOverview(supabase, org.id, id, period),
    getScoreboard(supabase, period.from, period.to),
    getScoreboard(supabase, prev.from, prev.to),
  ]);
  const profilesOf = (goalId: string) => ov.peopleOf(goalId).map((pid) => dir.byId.get(pid)).filter(Boolean) as Profile[];
  const msOf = (goalId: string) => ov.milestones.filter((m) => m.goal_id === goalId);
  const teamOf = (g: Goal) => (g.team_id ? dir.teamById.get(g.team_id) ?? null : null);
  const titleOf = (gid: string | null) => (gid ? ov.goals.find((g) => g.id === gid)?.title ?? t("people.evGoalFallback") : "");
  const inPeriod = (iso: string) => { const d = new Date(iso); return d >= period.from && d < period.to; };

  /* ── kerncijfers ── */
  const active = ov.goals.filter((g) => g.status !== "achieved");
  const onTrack = ov.goals.filter((g) => g.status === "on_track" || g.status === "achieved").length;
  const openKpis = ov.kpiViews.filter((v) => !v.openPeriod.done);
  const kpisOnTarget = ov.kpiViews.filter((v) => v.status === "achieved").length;
  const score = rows.find((r) => r.profile_id === id)?.total ?? 0;
  const rank = rows.findIndex((r) => r.profile_id === id);
  const delta = score - (prevRows.find((r) => r.profile_id === id)?.total ?? 0);

  /* ── focus: het ene doel dat nu het meest telt ── */
  const focus: Goal | null = ov.attention[0] ?? ov.upcoming[0]?.goal ?? active[0] ?? null;
  const moreAttention = ov.attention.filter((g) => g.id !== focus?.id);
  const focusNext = focus ? ov.upcoming.find((u) => u.goal.id === focus.id) ?? null : null;
  const why = !focus ? "" : focus.status === "behind" ? t("pd.whyBehind") : focus.status === "needs_attention" ? t("pd.whyAttention") : focus.status === "not_started" ? t("pd.whyNotStarted") : t("pd.whyOnTrack");

  /* ── eerstvolgende stap (alleen op je eigen dashboard; max 3) ── */
  const actions: NextAction[] = [];
  if (me) {
    for (const v of openKpis.slice(0, 2)) actions.push({ key: `k${v.kpi.id}`, icon: "checkin", tone: "mint", verb: t("pd.doCheckin", { k: v.kpi.name }), detail: t("pd.doCheckinDetail", { v: fmtValue(v.kpi.target_value, v.kpi.unit) }), minutes: 1, href: "/checkin" });
    for (const n of ov.mentions.slice(0, 1)) { const who = n.actor_id ? dir.byId.get(n.actor_id)?.full_name.split(" ")[0] : undefined; actions.push({ key: `n${n.id}`, icon: "mention", tone: "blue", verb: who ? t("pd.doReply", { name: who }) : n.title, detail: n.body || undefined, minutes: 2, href: n.href || "/notifications" }); }
    // Het focusdoel heeft al een eigen knop; hier het volgende doel dat een update kan gebruiken.
    const nudge = moreAttention[0] ?? active.find((g) => g.id !== focus?.id && ov.staleGoalIds.has(g.id));
    if (nudge) { const nn = ov.upcoming.find((u) => u.goal.id === nudge.id); actions.push({ key: `g${nudge.id}`, icon: goalVisual(nudge).name, tone: goalVisual(nudge).tone, verb: t("pd.doUpdate", { g: nudge.title }), detail: nn ? explainMilestone(t, nudge, nn.milestone) ?? undefined : undefined, minutes: 2, href: `/goals/${nudge.id}#voortgang` }); }
    for (const r of ov.routines.filter((x) => x.stats.done < x.stats.target).slice(0, 1)) actions.push({ key: `r${r.routine.id}`, icon: "repeat", tone: "mint", verb: t("pd.doRoutine", { r: r.routine.name }), detail: t("routine.ofTarget", { done: r.stats.done, target: r.stats.target }) + " · " + t(`routine.this.${r.routine.period}`).toLowerCase(), minutes: 1, href: `/goals/${r.goal.id}` });
    for (const m of ov.managedKpiViews.filter((x) => x.view.status === "behind" || x.view.status === "needs_attention").slice(0, 1)) actions.push({ key: `m${m.view.kpi.id}`, icon: "kpi", tone: "purple", verb: t("pd.doReviewKpi", { name: dir.byId.get(m.assignee)?.full_name.split(" ")[0] ?? "" }), detail: m.view.kpi.name, minutes: 2, href: `/kpis/${m.view.kpi.id}` });
  }
  const nextActions = actions.slice(0, 3);

  /* ── Momentum Ribbon ── */
  const nextMs = ov.upcoming[0];
  const segments: RibbonSegment[] = [
    { key: "goals", tone: "mint", label: t("pd.segGoals"), value: ov.goals.length ? t("pd.segGoalsValue", { a: onTrack, b: ov.goals.length }) : t("pd.segGoalsNone"), sub: ov.attention.length === 1 ? t("pd.segAttnOne") : ov.attention.length ? t("pd.segAttnMany", { n: ov.attention.length }) : ov.goals.length ? t("pd.segAllGood") : undefined, href: focus ? `/goals/${focus.id}` : me ? "/goals/new" : undefined },
    { key: "checkins", tone: "blue", label: t("pd.segCheckins"), value: !ov.kpiViews.length ? t("pd.segNoKpis") : openKpis.length === 1 ? t("pd.segOpenOne") : openKpis.length ? t("pd.segOpenMany", { n: openKpis.length }) : t("pd.segCheckinsDone"), sub: ov.kpiViews.length ? t("pd.segOnTarget", { a: kpisOnTarget, b: ov.kpiViews.length }) : undefined, href: me && openKpis.length ? "/checkin" : "/kpis" },
    { key: "milestone", tone: "purple", label: t("pd.segMilestone"), value: nextMs ? nextMs.milestone.name : t("pd.segMilestoneNone"), sub: nextMs ? [milestoneDistance(nextMs.goal, nextMs.milestone) ? t("pd.away", { v: milestoneDistance(nextMs.goal, nextMs.milestone)! }) : null, nextMs.goal.title].filter(Boolean).join(" · ") : undefined, href: nextMs ? `/goals/${nextMs.goal.id}` : undefined },
    { key: "score", tone: "yellow", label: t("pd.segScore"), value: t("pd.segScoreValue", { n: score }), sub: [rank >= 0 ? t("people.rankOf", { r: rank + 1, n: rows.length }) : null, delta > 0 ? t("pd.deltaUp", { n: delta }) : delta < 0 ? t("pd.deltaDown", { n: Math.abs(delta) }) : t("pd.deltaSame")].filter(Boolean).join(" · "), href: "/scoreboard" },
  ];
  const emphasis = openKpis.length && me ? "checkins" : ov.attention.length ? "goals" : nextMs && nextMs.frac >= 0.6 ? "milestone" : delta > 0 ? "score" : "goals";

  /* ── context in de header ── */
  const ctxBits: string[] = [];
  if (me && openKpis.length) ctxBits.push(openKpis.length === 1 ? t("pd.ctxCheckinOne") : t("pd.ctxCheckinMany", { n: openKpis.length }));
  if (ov.attention.length) ctxBits.push(ov.attention.length === 1 ? t("pd.ctxAttnOne") : t("pd.ctxAttnMany", { n: ov.attention.length }));
  const context = me
    ? ctxBits.length ? ctxBits.join(" · ") : ov.goals.length || ov.kpiViews.length ? t("pd.ctxGood") : t("pd.ctxEmpty")
    : [t(`role.${person.role}`), person.job_title, dir.teamsOf(id).map((tm) => tm.name).join(", ")].filter(Boolean).join(" · ");

  /* ── voortgang + momentum ── */
  const sortGoals = (list: Goal[]) => [...list].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.deadline.localeCompare(b.deadline));
  const personalList = sortGoals(ov.personalGoals.filter((g) => g.id !== focus?.id));
  const teamList = sortGoals(ov.sharedGoals.filter((g) => g.id !== focus?.id));
  const blocks = ov.upcoming.filter((u) => u.goal.id !== focus?.id).slice(0, 2).map((u) => ({ ...u, routine: ov.routines.find((r) => r.goal.id === u.goal.id) ?? null }));
  for (const r of ov.routines) if (blocks.length < 3 && !blocks.some((b) => b.routine?.routine.id === r.routine.id)) blocks.push({ goal: r.goal, milestone: null as never, reward: null, frac: 0, routine: r });
  const hasMomentum = blocks.length > 0;
  // Op je eigen dashboard een lege staat met actie; bij een collega geen lege sectie.
  const showProgressList = personalList.length > 0 || (me && ov.personalGoals.length === 0);

  /* ── team + activiteit ── */
  const relationOf = (g: Goal) => {
    const mine = ov.updates.filter((u) => u.goal_id === g.id && u.profile_id === id && inPeriod(u.created_at)).length;
    if (mine > 0) return me ? (mine === 1 ? t("pd.relMeOne") : t("pd.relMeMany", { n: mine })) : (mine === 1 ? t("pd.relOtherOne", { name: first }) : t("pd.relOtherMany", { name: first, n: mine }));
    const others = ov.updates.filter((u) => u.goal_id === g.id && u.profile_id !== id);
    if (!others.length) return t("pd.relNone");
    const names = Array.from(new Set(others.slice(0, 6).map((u) => u.profile_id))).slice(0, 2).map((pid) => dir.byId.get(pid)?.full_name.split(" ")[0] ?? t("dashboard.someone"));
    const when = fmtRelative(others[0].created_at, locale);
    return names.length > 1 ? t("pd.relRecentMany", { names: names.join(` ${t("pd.and")} `), when }) : t("pd.relRecentOne", { name: names[0], when });
  };
  const visibleEvents = teamList.length ? clamp(teamList.length * 2 + 1, 3, 5) : 5;

  const accent = focus ? accentOf(focus, teamOf(focus)) : TONE_STYLE.blue.hex;

  return (
    <div className="grid grid-cols-1 gap-6 lg:gap-8 pt-1">
      {/* 1 · Compacte header */}
      <header className="order-1 lg:order-none flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar name={person.full_name} src={person.avatar_url} size="md" ring />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[1.75rem] leading-tight inline-flex items-center gap-2">{me ? greetingFor(t, person.full_name) : person.full_name}<HelpButton topic="people" size="sm" /></h1>
              <p className="text-sm t-muted mt-0.5 truncate">{context}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {me ? (
              <ButtonLink href={focus ? `/goals/${focus.id}#voortgang` : "/goals/new"} size="md">{focus ? t("pd.updateProgress") : t("dashboard.newGoal")} <ArrowRight className="size-4" aria-hidden /></ButtonLink>
            ) : (
              <ButtonLink href={`/messages/${person.id}`} size="md"><MessageCircle className="size-4" aria-hidden /> {t("people.message")}</ButtonLink>
            )}
            <HeaderMenu label={t("pd.more")}>
              {me ? (
                <>
                  <Link href="/goals/new" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Plus className="size-4 text-ink-2" aria-hidden /> {t("dashboard.newGoal")}</Link>
                  <Link href="/kpis/new" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Gauge className="size-4 text-ink-2" aria-hidden /> {t("kpis.newKpi")}</Link>
                  <Link href="/scoreboard" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Trophy className="size-4 text-ink-2" aria-hidden /> {t("pd.scoreDetail")}</Link>
                  <Link href="/settings" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Pencil className="size-4 text-ink-2" aria-hidden /> {t("people.editProfile")}</Link>
                </>
              ) : (
                <>
                  <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="high_five" /><button type="submit" role="menuitem" className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Hand className="size-4 text-blue-deep" aria-hidden /> {t("people.highFive")}</button></form>
                  <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="thanks" /><button type="submit" role="menuitem" className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><Heart className="size-4 text-coral-deep" aria-hidden /> {t("people.thanks")}</button></form>
                  <Link href="/scoreboard" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cloud"><BarChart3 className="size-4 text-ink-2" aria-hidden /> {t("pd.scoreDetail")}</Link>
                </>
              )}
            </HeaderMenu>
          </div>
        </div>
        <PeriodBar current={period.key} label={period.label} />
      </header>

      {/* 2 · Momentum Ribbon */}
      <div className="order-3 lg:order-none">
        <MomentumRibbon segments={segments} emphasis={emphasis} ariaLabel={t("pd.ribbonAria", { p: period.label })} />
      </div>

      {/* 3 · Focus + eerstvolgende stap */}
      <div className="zone-row">
        <section aria-labelledby="focus-title" className={`order-5 lg:order-none surface-focus relative overflow-hidden p-6 sm:p-8 ${nextActions.length ? "lg:col-span-8" : "lg:col-span-12"}`} style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${accent} 16%, transparent), transparent 60%), linear-gradient(160deg, #FFFFFF, #F7F8FF)` }} data-tour="focus">
          <p className="t-label">{me ? t("pd.focusEyebrow") : t("pd.focusEyebrowOther", { name: first })}</p>
          {focus ? (
            <>
              <div className="flex items-start gap-3.5 mt-3">
                <ClayIcon name={goalVisual(focus).name} tone={goalVisual(focus).tone} size="lg" color={focus.goal_type === "team" ? teamOf(focus)?.color : undefined} />
                <div className="min-w-0 flex-1">
                  <h2 id="focus-title" className="text-2xl sm:text-[1.75rem] leading-tight"><Link href={`/goals/${focus.id}`} className="hover:text-blue-deep">{focus.title}</Link></h2>
                  <p className="text-sm t-muted mt-1">{t(`goalFormat.${effectiveFormat(focus)}.name`)} · {focus.goal_type === "personal" ? t("goalType.personal") : teamOf(focus)?.name ?? t("goalCard.wholeCompany")} · {t("pd.until", { d: fmtDate(focus.deadline, "d MMMM", locale) })}</p>
                </div>
                <span className="hidden sm:block shrink-0"><StatusPill status={focus.status} progress={goalProgress(focus)} /></span>
              </div>
              <p className="mt-5 text-lg text-ink">{why}</p>
              <p className="mt-1 text-[0.9375rem] text-ink-2">
                <span className="font-display font-extrabold text-ink text-xl">{progressLabel(t, focus)}</span>
                {focusNext && <> — {explainMilestone(t, focus, focusNext.milestone)}</>}
                {focusNext?.reward && <span className="text-purple-deep font-semibold"> · {t("pd.rewardShort", { r: focusNext.reward.title })}</span>}
              </p>
              <div className="mt-2 -mx-2">
                <Parallax><ProgressPath goal={focus} milestones={msOf(focus.id)} rewards={ov.rewards} contributors={profilesOf(focus.id).slice(0, 3)} compact accent={accent} caption={false} /></Parallax>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm t-muted"><AvatarStack people={profilesOf(focus.id)} size="sm" max={4} />{profilesOf(focus.id).length > 0 && <span className="hidden sm:inline">{t("pd.involved", { n: profilesOf(focus.id).length })}</span>}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/goals/${focus.id}`} variant="secondary">{t("pd.viewProgress")} <ArrowRight className="size-4" aria-hidden /></ButtonLink>
                </div>
              </div>
              {moreAttention.length > 0 && (
                <details className="group mt-5 pt-4 border-t border-line/70">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
                    <ArrowRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden /> {moreAttention.length === 1 ? t("pd.seeMoreOne") : t("pd.seeMoreMany", { n: moreAttention.length })}
                  </summary>
                  <ul className="mt-3 divide-y divide-line/70">
                    {moreAttention.map((g) => (
                      <li key={g.id}>
                        <Link href={`/goals/${g.id}`} className="flex items-center gap-3 py-2.5 hover:text-blue-deep">
                          <ClayIcon name={goalVisual(g).name} tone={goalVisual(g).tone} size="sm" />
                          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{g.title}</span><span className="block text-xs t-muted">{progressLabel(t, g)}</span></span>
                          <StatusPill status={g.status} progress={goalProgress(g)} size="xs" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <ClayIcon name="rocket" tone="coral" size="lg" />
              <div className="min-w-0 flex-1">
                <h2 id="focus-title" className="text-2xl leading-tight">{me ? t("pd.focusEmptyMe") : t("pd.focusEmptyOther", { name: first })}</h2>
                <p className="text-ink-2 mt-1">{me ? t("pd.focusEmptyBody") : t("people.noGoalsBody")}</p>
              </div>
              {me && <ButtonLink href="/goals/new">{t("dashboard.firstGoal")} <ArrowRight className="size-4" aria-hidden /></ButtonLink>}
            </div>
          )}
        </section>

        {nextActions.length > 0 && (
          <aside aria-labelledby="next-title" className="order-4 lg:order-none lg:col-span-4 rounded-[24px] p-6 flex flex-col" style={{ background: "linear-gradient(180deg, #E6FBF4, #F2FCF8)" }} data-tour="next-step">
            <p className="t-label">{t("pd.nextEyebrow")}</p>
            <h2 id="next-title" className="text-xl mt-1 mb-4">{t("pd.nextTitle")}</h2>
            <NextActions actions={nextActions} t={t} />
            <Link href="/dashboard" className="mt-auto pt-4 text-sm font-semibold text-mint-deep hover:underline inline-flex items-center gap-1">{t("pd.toToday")} <ArrowRight className="size-3.5" aria-hidden /></Link>
          </aside>
        )}
      </div>

      {/* 4 · Mijn voortgang + Momentum (één oppervlak) */}
      {(showProgressList || hasMomentum) && (
        <div className="zone" data-tour="my-progress">
          {showProgressList && (
            <section aria-labelledby="progress-title" className={`zone-part order-6 lg:order-none p-6 sm:p-7 ${hasMomentum ? "lg:col-span-8" : "lg:col-span-12"}`}>
              <ZoneTitle id="progress-title" title={me ? t("pd.progressTitle") : t("people.personalGoalsOf", { name: first })} sub={me ? t("people.personalGoalsSubMe") : t("people.onlyVisible")} action={me ? <ButtonLink href="/goals/new" size="sm" variant="secondary"><Plus className="size-3.5" aria-hidden /> {t("pd.newGoalShort")}</ButtonLink> : undefined} />
              {personalList.length ? (
                <ul className="divide-y divide-line">{personalList.map((g) => <GoalJourneyRow key={g.id} goal={g} milestones={msOf(g.id)} t={t} locale={locale} canUpdate={me} />)}</ul>
              ) : (
                <p className="text-sm t-muted flex flex-wrap items-center gap-x-3 gap-y-2">{me ? t("pd.noPersonalMe") : t("people.noGoalsBody")}{me && <Link href="/goals/new" className="font-semibold text-blue-deep hover:underline">{t("dashboard.firstGoal")}</Link>}</p>
              )}
            </section>
          )}
          {hasMomentum && (
            <section aria-labelledby="momentum-title" className={`zone-part order-8 lg:order-none p-6 sm:p-7 ${showProgressList ? "lg:col-span-4 lg:border-l lg:border-line" : "lg:col-span-12"}`}>
              <h2 id="momentum-title" className="text-xl leading-tight mb-5">{t("pd.momentumTitle")}</h2>
              <ul className="flex flex-col gap-5">
                {blocks.map((b) => (
                  <li key={(b.milestone?.id ?? "") + (b.routine?.routine.id ?? "")} className="relative pl-5">
                    <span aria-hidden className="absolute left-0 top-1.5 bottom-1 w-1 rounded-full" style={{ background: accentOf(b.goal, teamOf(b.goal)) }} />
                    {b.milestone && (
                      <>
                        <Link href={`/goals/${b.goal.id}`} className="font-display font-extrabold leading-snug hover:text-blue-deep inline-flex items-center gap-1.5"><Flag className="size-3.5 text-ink-3" aria-hidden />{b.milestone.name}</Link>
                        <p className="text-xs t-muted mt-0.5">{milestoneDistance(b.goal, b.milestone) ? t("pd.away", { v: milestoneDistance(b.goal, b.milestone)! }) : b.goal.title}{b.reward ? <span className="text-purple-deep font-semibold"> · {t("pd.rewardShort", { r: b.reward.title })}</span> : null}</p>
                      </>
                    )}
                    {b.routine && (
                      <div className={b.milestone ? "mt-3" : ""}>
                        <p className="text-sm font-semibold">{t(`routine.this.${b.routine.routine.period}`)} {b.routine.routine.name.toLowerCase()}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex gap-1" aria-hidden>{Array.from({ length: Math.max(b.routine.stats.target, b.routine.stats.done) }, (_, i) => <span key={i} className={`h-2 w-5 rounded-full ${i < b.routine!.stats.done ? "bg-mint" : "bg-cloud"}`} />)}</span>
                          <span className="text-xs t-muted">{t("pd.sessions", { a: b.routine.stats.done, b: b.routine.stats.target })}{b.routine.stats.consistency !== null ? ` · ${t("routine.consistency").toLowerCase()} ${pct(b.routine.stats.consistency)}` : ""}</span>
                        </div>
                        {!b.milestone && <p className="text-xs t-muted mt-1">{b.goal.title}</p>}
                        {me && b.routine.stats.done < b.routine.stats.target && <Link href={`/goals/${b.goal.id}`} className="inline-block mt-2 text-xs font-semibold text-mint-deep hover:underline">{t("pd.doRoutine", { r: b.routine.routine.name })} →</Link>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* 5 · Samen met het team + recente activiteit (één oppervlak) */}
      <div className="zone">
        {teamList.length > 0 && (
          <section aria-labelledby="team-title" className="zone-part order-7 lg:order-none p-6 sm:p-7 lg:col-span-7">
            <ZoneTitle id="team-title" title={t("people.sharedGoals")} sub={me ? t("pd.teamSubMe") : t("pd.teamSubOther", { name: first })} />
            <ul className="divide-y divide-line">{teamList.map((g) => <TeamLane key={g.id} goal={g} milestones={msOf(g.id)} team={teamOf(g)} people={profilesOf(g.id)} relation={relationOf(g)} t={t} />)}</ul>
          </section>
        )}
        <section aria-labelledby="activity-title" className={`zone-part order-9 lg:order-none p-6 sm:p-7 ${teamList.length ? "lg:col-span-5 lg:border-l lg:border-line" : "lg:col-span-12"}`}>
          <h2 id="activity-title" className="text-xl leading-tight mb-5">{t("pd.activityTitle")}</h2>
          <div className={teamList.length ? "" : "lg:max-w-2xl"}>
            <ActivityTimeline groups={ov.activity} visible={visibleEvents} byId={dir.byId} viewerId={profile.id} t={t} locale={locale} goalTitle={titleOf} />
          </div>
        </section>
      </div>

      {/* 6 · KPI's */}
      <section aria-labelledby="kpi-title" className="order-10 lg:order-none">
        {ov.kpiViews.length ? (
          <div className="surface p-6 sm:p-7">
            <ZoneTitle id="kpi-title" title={ov.kpiViews.length === 1 ? t("people.kpiCountOne") : t("people.kpiCount", { n: ov.kpiViews.length })} sub={t("people.kpisSub")} action={<Link href="/kpis" className="text-sm font-semibold text-blue-deep hover:underline">{t("dashboard.allKpis")}</Link>} />
            <KpiRows views={ov.kpiViews} t={t} canCheckin={me} />
          </div>
        ) : (
          <div className="surface px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <ClayIcon name="kpi" tone="blue" size="sm" />
            <h2 id="kpi-title" className="font-sans font-semibold text-[0.9375rem] flex-1 min-w-48">{me ? t("pd.kpiEmptyMe") : t("pd.kpiEmptyOther", { name: first })}</h2>
            <div className="flex flex-wrap gap-2">
              {me && <ButtonLink href="/kpis/new" size="sm" variant="secondary"><Plus className="size-3.5" aria-hidden /> {t("pd.kpiCreate")}</ButtonLink>}
              <ButtonLink href="/kpis" size="sm" variant="ghost">{t("pd.kpiTeam")}</ButtonLink>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
