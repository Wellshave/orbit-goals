import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { ScoreTable } from "@/components/scoreboard/score-table";
import { Panel, SectionHeading, Tile, Avatar, ButtonLink } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { TeamForm, TeamMembersEditor } from "@/components/people/team-form";
import { deleteTeam } from "@/app/actions/org";
import { HelpButton } from "@/components/help/help-button";
import { goalProgress } from "@/lib/status";
import { pct } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from("teams").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ? data.name : { absolute: "Orbit" } };
}

export default async function TeamPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, org, profile, isAdmin, locale, t } = await getSession();
  const period = resolvePeriod(sp, "month", locale);
  const dir = await getDirectory();
  const team = dir.teamById.get(id);
  if (!team) notFound();
  const members = dir.membersOf(id);
  const [goals, kpis, rows] = await Promise.all([listGoals(supabase, org.id), listKpis(supabase, org.id), getScoreboard(supabase, period.from, period.to, id)]);
  const tg = goals.filter((g) => g.team_id === id);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([listAssignments(supabase, tg.map((g) => g.id)), listMilestones(supabase, tg.map((g) => g.id)), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 800 })]);
  const tk = kpis.filter((k) => k.team_id === id).map((k) => buildKpiView(k, kpiAssignments, checkins, period));
  const active = tg.filter((g) => g.status !== "achieved");
  const avg = active.length ? active.reduce((s, g) => s + Math.min(1, goalProgress(g)), 0) / active.length : tg.length ? 1 : 0;
  const ms = milestones.filter((m) => m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to);
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const lead = dir.memberships.find((m) => m.team_id === id && m.is_lead);

  return (
    <div className="pt-2 flex flex-col gap-8">
      <section className="card-lift p-6 sm:p-8 flex flex-wrap items-center gap-5" style={{ background: `linear-gradient(135deg, #FFFFFF, color-mix(in oklab, ${team.color} 16%, white))` }}>
        <ClayIcon name="team" size="xl" color={team.color} />
        <div className="min-w-0 flex-1">
          <p className="t-label">{t("teams.teamPage")}</p>
          <h1 className="text-3xl sm:text-4xl inline-flex items-start gap-3">{team.name}<HelpButton topic="team" className="mt-1.5" /></h1>
          {team.description && <p className="t-muted mt-1">{team.description}</p>}
          <div className="mt-3 flex -space-x-2">{members.map((m) => <Avatar key={m.id} name={m.full_name} src={m.avatar_url} size="sm" className="ring-2 ring-white" />)}</div>
        </div>
        {isAdmin && <ButtonLink href="/goals/new" size="sm" variant="secondary">{t("teams.createTeamGoal")}</ButtonLink>}
      </section>
      <PeriodBar current={period.key} label={period.label} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon="trend" tone="blue" label={t("teams.avg")} value={pct(avg)} sub={t("teams.activeGoals", { n: active.length })} />
        <Tile icon="check" tone="mint" label={t("teams.kpisOnCourse")} value={`${tk.filter((v) => v.status === "on_track" || v.status === "achieved").length}/${tk.length}`} sub={t("teams.onCourseSub")} />
        <Tile icon="flag" tone="yellow" label={t("teams.milestones", { p: period.short.toLowerCase() })} value={ms.length} sub={t("teams.achievedTogether")} />
        <Tile icon="trophy" tone="purple" label={t("teams.teamPoints")} value={rows.reduce((s, r) => s + r.total, 0)} sub={t("teams.activeOf", { a: rows.length, b: members.length })} />
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-8 min-w-0">
          <section><SectionHeading title={t("teams.teamGoals")} />{tg.length === 0 ? <p className="text-sm t-muted">{t("teams.noTeamGoals")}</p> : <div className="grid md:grid-cols-2 gap-4">{tg.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={team} owner={dir.byId.get(g.owner_id)} compact />)}</div>}</section>
          <section><SectionHeading title={t("teams.teamKpis")} />{tk.length === 0 ? <p className="text-sm t-muted">{t("teams.noTeamKpis")}</p> : <div className="grid md:grid-cols-2 gap-4">{tk.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((x) => dir.byId.get(x)!).filter(Boolean)} showCheckin={false} />)}</div>}</section>
          <section><SectionHeading title={t("scoreboard.contributionsInTeam")} /><ScoreTable rows={rows} byId={dir.byId} teamsOf={dir.teamsOf} highlight={profile.id} t={t} /></section>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={`${members.length}`} title={t("teams.members")}>
            <ul className="flex flex-col gap-3">
              {members.map((m) => <li key={m.id}><Link href={`/people/${m.id}`} className="press flex items-center gap-3 rounded-2xl p-1.5 -m-1.5 hover:bg-cloud"><Avatar name={m.full_name} src={m.avatar_url} size="md" ring /><span className="min-w-0"><span className="block font-bold text-sm truncate">{m.full_name}{lead?.profile_id === m.id ? <span className="text-xs text-purple-deep font-medium"> · {t("common.lead")}</span> : ""}</span><span className="block text-xs t-muted truncate">{m.job_title}</span></span></Link></li>)}
              {members.length === 0 && <li className="text-sm t-muted">{t("teams.noMembers")}</li>}
            </ul>
            {isAdmin && <div className="mt-4"><TeamMembersEditor teamId={id} members={dir.members} current={members.map((m) => m.id)} /></div>}
          </Panel>
          {isAdmin && <Panel eyebrow={t("teams.manage")} title={t("teams.editTeam")}><TeamForm orgId={org.id} team={team} /><form action={deleteTeam} className="mt-4 pt-4 border-t border-line"><input type="hidden" name="id" value={id} /><button type="submit" className="text-sm font-semibold text-coral-deep hover:underline">{t("teams.deleteTeam")}</button></form></Panel>}
        </aside>
      </div>
    </div>
  );
}
