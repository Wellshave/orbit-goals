import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { ScoreTable } from "@/components/scoreboard/score-table";
import { Panel, Stat, Avatar, ButtonLink } from "@/components/ui";
import { TeamForm, TeamMembersEditor } from "@/components/people/team-form";
import { deleteTeam } from "@/app/actions/org";
import { goalProgress } from "@/lib/status";
import { pct } from "@/lib/format";

export default async function TeamPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const period = resolvePeriod(sp, "month");
  const { supabase, org, profile, isAdmin } = await getSession();
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
    <>
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: team.color }} aria-hidden />Teamdashboard</span>} title={team.name} description={team.description || undefined} actions={isAdmin ? <ButtonLink href="/goals/new" size="sm" variant="secondary">Teamdoel aanmaken</ButtonLink> : undefined}>
        <PeriodBar current={period.key} label={period.label} />
      </PageHeader>
      <section className="deck p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6" aria-label="Kerngetallen">
        <Stat label="Gemiddelde voortgang" value={pct(avg)} sub={`${active.length} actieve doelen`} tone="cobalt" />
        <Stat label="KPI's op schema" value={`${tk.filter((v) => v.status === "on_track" || v.status === "achieved").length}/${tk.length}`} sub="op schema of behaald" />
        <Stat label={`Milestones · ${period.short.toLowerCase()}`} value={ms.length} tone="orchid" />
        <Stat label="Teampunten" value={rows.reduce((s, r) => s + r.total, 0)} sub={`${rows.length} van ${members.length} actief`} />
      </section>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={`${tg.length}`} title="Teamdoelen">
            {tg.length === 0 ? <p className="text-sm text-muted">Nog geen teamdoelen.</p> : <div className="grid md:grid-cols-2 gap-3">{tg.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} compact />)}</div>}
          </Panel>
          <Panel eyebrow={`${tk.length}`} title="Team-KPI's">
            {tk.length === 0 ? <p className="text-sm text-muted">Nog geen KPI&apos;s aan dit team gekoppeld.</p> : <div className="grid md:grid-cols-2 gap-3">{tk.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((x) => dir.byId.get(x)!).filter(Boolean)} showCheckin={false} />)}</div>}
          </Panel>
          <Panel eyebrow={period.label} title="Bijdragen binnen het team">
            <ScoreTable rows={rows} byId={dir.byId} teamsOf={dir.teamsOf} highlight={profile.id} />
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={`${members.length}`} title="Teamleden">
            <ul className="flex flex-col gap-2.5">
              {members.map((m) => (
                <li key={m.id}><Link href={`/people/${m.id}`} className="flex items-center gap-2.5 rounded p-1 -m-1 hover:bg-ice/5"><Avatar name={m.full_name} src={m.avatar_url} size="sm" /><span className="min-w-0"><span className="block text-sm font-semibold truncate">{m.full_name}{lead?.profile_id === m.id ? <span className="text-xs text-orchid-soft font-normal"> · lead</span> : ""}</span><span className="block text-xs text-muted truncate">{m.job_title}</span></span></Link></li>
              ))}
              {members.length === 0 && <li className="text-sm text-muted">Nog geen leden.</li>}
            </ul>
            {isAdmin && <div className="mt-4"><TeamMembersEditor teamId={id} members={dir.members} current={members.map((m) => m.id)} /></div>}
          </Panel>
          {isAdmin && (
            <Panel eyebrow="Beheer" title="Team bewerken">
              <TeamForm orgId={org.id} team={team} />
              <form action={deleteTeam} className="mt-4 pt-4 border-t border-line"><input type="hidden" name="id" value={id} /><button type="submit" className="text-sm font-semibold text-coral-soft hover:underline">Team verwijderen</button></form>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
