import Link from "next/link";
import { notFound } from "next/navigation";
import { Hand, Heart, MessageCircle, Pencil } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { getPersonOverview } from "@/lib/data/person";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { Panel, SectionHeading, Avatar, Tile, EmptyState, ButtonLink } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { goalVisual } from "@/lib/goals/formats";
import { SCORE_ORDER } from "@/lib/score";
import { fmtDate, fmtRelative, fmtValue, pct } from "@/lib/format";
import { sendKudos } from "@/app/actions/misc";
import { HelpButton } from "@/components/help/help-button";
import type { ActivityEvent } from "@/lib/types";

/** Persoonlijk dashboard van één persoon. Gedeeld door /me en /people/[id]. */
export async function PersonDashboard({ personId: id, sp }: { personId: string; sp: Record<string, string | string[] | undefined> }) {
  const { supabase, org, profile, locale, t } = await getSession();
  const period = resolvePeriod(sp, "month", locale);
  const dir = await getDirectory();
  const person = dir.byId.get(id);
  if (!person) notFound();
  const me = person.id === profile.id;

  const [ov, rows] = await Promise.all([getPersonOverview(supabase, org.id, id, period), getScoreboard(supabase, period.from, period.to)]);
  const score = rows.find((r) => r.profile_id === id);
  const rank = rows.findIndex((r) => r.profile_id === id);
  const teams = dir.teamsOf(id);
  const peopleOf = (goalId: string) => ov.peopleOf(goalId).map((pid) => dir.byId.get(pid)!).filter(Boolean);

  const onTrack = ov.goals.filter((g) => g.status === "on_track" || g.status === "achieved").length;
  const kpisOnTarget = ov.kpiViews.filter((v) => v.status === "achieved").length;
  const openCheckins = ov.kpiViews.filter((v) => !v.openPeriod.done).length;
  const goalIdSet = new Set(ov.goals.map((g) => g.id));
  const milestonesDone = ov.milestones.filter((m) => goalIdSet.has(m.goal_id) && m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to).length;
  const firstName = person.full_name.split(" ")[0];

  const eventText = (e: ActivityEvent) => {
    const p = (e.payload ?? {}) as Record<string, string>;
    const g = e.goal_id ? ov.goals.find((x) => x.id === e.goal_id)?.title ?? dir.byId.get(e.actor_id ?? "")?.full_name ?? "" : "";
    return t(`people.ev.${e.kind}`, { g: g || t("people.evGoalFallback"), m: p.name ?? "" });
  };

  return (
    <div className="pt-2 flex flex-col gap-8">
      <section className="card-lift p-6 sm:p-8 flex flex-wrap items-center gap-5" style={{ background: "linear-gradient(135deg,#FFFFFF,#ECE5FF)" }}>
        <Avatar name={person.full_name} src={person.avatar_url} size="xl" ring />
        <div className="min-w-0 flex-1">
          <p className="t-label">{me ? t("people.myDashboard") : t(`role.${person.role}`)}{teams.length ? ` · ${teams.map((tm) => tm.name).join(", ")}` : ""}</p>
          <h1 className="text-3xl sm:text-4xl inline-flex items-start gap-3">{person.full_name}<HelpButton topic="people" className="mt-1.5" /></h1>
          <p className="t-muted mt-1">{person.job_title || t("people.noTitle")} · {person.started_at ? t("people.worksSince", { d: fmtDate(person.started_at, "MMMM yyyy", locale) }) : t("people.since", { d: fmtDate(person.created_at, "MMMM yyyy", locale) })}</p>
          {person.focus && <p className="mt-2 text-sm"><span className="font-semibold">{t("people.focusLabel")}:</span> {person.focus}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {me ? (
            <ButtonLink href="/settings" variant="secondary" size="sm"><Pencil className="size-3.5" aria-hidden /> {t("people.editProfile")}</ButtonLink>
          ) : (
            <>
              <Link href={`/messages/${person.id}`} className="press inline-flex items-center gap-2 rounded-full bg-white text-mint-deep font-semibold text-sm px-4 py-2.5 shadow-[var(--shadow-press)] hover:bg-mint hover:text-ink"><MessageCircle className="size-4" aria-hidden /> {t("people.message")}</Link>
              <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="high_five" /><button type="submit" className="press inline-flex items-center gap-2 rounded-full bg-white text-blue-deep font-semibold text-sm px-4 py-2.5 shadow-[var(--shadow-press)] hover:bg-blue hover:text-white"><Hand className="size-4" aria-hidden /> {t("people.highFive")}</button></form>
              <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="thanks" /><button type="submit" className="press inline-flex items-center gap-2 rounded-full bg-white text-coral-deep font-semibold text-sm px-4 py-2.5 shadow-[var(--shadow-press)] hover:bg-coral hover:text-white"><Heart className="size-4" aria-hidden /> {t("people.thanks")}</button></form>
            </>
          )}
        </div>
      </section>

      <PeriodBar current={period.key} label={period.label} />

      <section aria-label={t("people.summary")} className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Tile tone="mint" icon="rocket" label={t("people.tileGoals")} value={ov.goals.length ? `${onTrack}/${ov.goals.length}` : "–"} sub={ov.attention.length === 1 ? t("people.tileGoalsSubOne") : ov.attention.length ? t("people.tileGoalsSub", { n: ov.attention.length }) : t("people.tileGoalsOk")} />
        <Tile tone="blue" icon="kpi" label={t("people.tileKpis")} value={ov.kpiViews.length ? `${kpisOnTarget}/${ov.kpiViews.length}` : "–"} sub={openCheckins === 1 ? t("people.tileKpisOpenOne") : openCheckins ? t("people.tileKpisOpen", { n: openCheckins }) : t("people.tileKpisDone")} />
        <Tile tone="yellow" icon="trophy" label={t("people.points")} value={score?.total ?? 0} sub={rank >= 0 ? t("people.rankOf", { r: rank + 1, n: rows.length }) : period.label} />
        <Tile tone="purple" icon="star" label={t("people.tileMilestones")} value={milestonesDone} sub={period.label} />
      </section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-8 min-w-0">
          {ov.attention.length > 0 && (
            <section>
              <SectionHeading help="status" title={t("people.attention")} sub={me ? t("people.attentionSubMe") : t("people.attentionSub", { name: firstName })} />
              <div className="grid md:grid-cols-2 gap-4">
                {ov.attention.slice(0, 4).map((g) => <GoalCard key={g.id} goal={g} milestones={ov.milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} owner={dir.byId.get(g.owner_id)} action={me ? "update" : "open"} compact />)}
              </div>
            </section>
          )}

          <section>
            <SectionHeading title={me ? t("people.myGoals") : t("people.personalGoalsOf", { name: firstName })} sub={me ? t("people.personalGoalsSubMe") : t("people.onlyVisible")} actions={me ? <ButtonLink href="/goals/new" size="sm" variant="secondary">{t("dashboard.newGoal")}</ButtonLink> : undefined} />
            {ov.personalGoals.length === 0 ? (
              <EmptyState compact icon="rocket" tone="coral" title={t("people.noGoals")} body={me ? t("people.noGoalsBodyMe") : t("people.noGoalsBody")} action={me ? <ButtonLink href="/goals/new" size="sm">{t("dashboard.firstGoal")}</ButtonLink> : undefined} />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">{ov.personalGoals.map((g) => <GoalCard key={g.id} goal={g} milestones={ov.milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} owner={dir.byId.get(g.owner_id)} compact />)}</div>
            )}
          </section>

          {ov.sharedGoals.length > 0 && (
            <section>
              <SectionHeading title={t("people.sharedGoals")} sub={t("people.sharedGoalsSub")} />
              <div className="grid md:grid-cols-2 gap-4">{ov.sharedGoals.map((g) => <GoalCard key={g.id} goal={g} milestones={ov.milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} owner={dir.byId.get(g.owner_id)} compact />)}</div>
            </section>
          )}

          <section>
            <SectionHeading title={ov.kpiViews.length === 1 ? t("people.kpiCountOne") : t("people.kpiCount", { n: ov.kpiViews.length })} sub={t("people.kpisSub")} actions={me ? <ButtonLink href="/kpis/new" size="sm" variant="secondary">{t("kpis.newKpi")}</ButtonLink> : undefined} />
            {ov.kpiViews.length === 0 ? (
              <p className="text-sm t-muted">{t("people.noKpis")}</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">{ov.kpiViews.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((x) => dir.byId.get(x)!).filter(Boolean)} showCheckin={me} />)}</div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={period.label} title={t("people.score")} tone="butter" help="scoreboard">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Tile tone="yellow" label={t("people.points")} value={score?.total ?? 0} className="bg-white/80" />
              <Tile tone="yellow" label={t("people.position")} value={rank >= 0 ? `#${rank + 1}` : "–"} sub={t("people.ofN", { n: rows.length })} className="bg-white/80" />
            </div>
            <ul className="divide-y divide-line">
              {SCORE_ORDER.filter((k) => score?.breakdown[k]).map((k) => <li key={k} className="py-1.5 flex justify-between text-sm"><span>{t(`score.${k}.label`)} <span className="text-xs t-muted">· {score!.breakdown[k]!.entries}×</span></span><span className="font-bold tnum">{score!.breakdown[k]!.points}</span></li>)}
              {!score && <li className="py-1.5 text-sm t-muted">{t("people.noContrib")}</li>}
            </ul>
          </Panel>

          {ov.routines.length > 0 && (
            <Panel eyebrow={t("routine.eyebrow")} title={t("people.routines")} tone="mint">
              <ul className="flex flex-col gap-4">
                {ov.routines.map(({ routine, goal, stats }) => (
                  <li key={routine.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{routine.name}</p>
                      <p className="font-display font-extrabold tnum shrink-0">{t("routine.ofTarget", { done: stats.done, target: stats.target })}</p>
                    </div>
                    <Link href={`/goals/${goal.id}`} className="text-xs t-muted hover:text-blue-deep truncate block">{goal.title}</Link>
                    <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                      {Array.from({ length: Math.max(routine.times_per_period, stats.done) }, (_, i) => <span key={i} className={`h-2 flex-1 min-w-4 rounded-full ${i < stats.done ? "bg-mint" : "bg-white"}`} />)}
                    </div>
                    {stats.consistency !== null && <p className="text-xs t-muted mt-1.5">{t("routine.consistency")}: {pct(stats.consistency)}</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {ov.upcoming.length > 0 && (
            <Panel eyebrow={t("dashboard.almostThere")} title={t("people.upcoming")} help="milestones">
              <ul className="flex flex-col gap-3">
                {ov.upcoming.map(({ goal, milestone, reward, frac }) => (
                  <li key={milestone.id} className="flex items-start gap-3">
                    <ClayIcon name={goalVisual(goal).name} tone={goalVisual(goal).tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/goals/${goal.id}`} className="block font-semibold text-sm truncate hover:text-blue-deep">{milestone.name}</Link>
                      <p className="text-xs t-muted truncate">{goal.title}{goal.measure === "numeric" ? ` · ${fmtValue(milestone.target_value, goal.unit)}` : ""}</p>
                      {reward && <p className="text-xs text-purple-deep font-semibold truncate">{t("people.reward", { r: reward.title })}</p>}
                    </div>
                    <span className="text-xs font-bold tnum shrink-0">{pct(frac)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel eyebrow={t("people.activityEyebrow")} title={me ? t("people.myActivity") : t("people.activityOf", { name: firstName })}>
            {ov.events.length === 0 ? (
              <p className="text-sm t-muted">{t("people.noActivity")}</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {ov.events.slice(0, 8).map((e) => (
                  <li key={e.id} className="text-sm flex items-start gap-2.5">
                    <span className="mt-1.5 size-2 rounded-full bg-blue shrink-0" aria-hidden />
                    <span className="min-w-0">
                      {e.goal_id ? <Link href={`/goals/${e.goal_id}`} className="hover:text-blue-deep">{eventText(e)}</Link> : eventText(e)}
                      <span className="block text-xs t-muted">{fmtRelative(e.created_at, locale)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
