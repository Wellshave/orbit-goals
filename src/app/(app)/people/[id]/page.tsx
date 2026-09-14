import { notFound } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { Panel, Stat, Avatar } from "@/components/ui";
import { ProfileEditor } from "@/components/people/profile-editor";
import { ROLE_LABELS } from "@/lib/status";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";
import { fmtDate } from "@/lib/format";

export default async function PersonPage({ params, searchParams }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const period = resolvePeriod(sp, "month");
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const person = dir.byId.get(id);
  if (!person) notFound();
  const me = person.id === profile.id;
  const [goals, kpis, rows] = await Promise.all([listGoals(supabase, org.id), listKpis(supabase, org.id), getScoreboard(supabase, period.from, period.to)]);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([listAssignments(supabase, goals.map((g) => g.id)), listMilestones(supabase, goals.map((g) => g.id)), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 800 })]);
  const theirGoals = goals.filter((g) => g.owner_id === id || assignments.some((a) => a.goal_id === g.id && a.profile_id === id));
  const theirKpis = kpis.filter((k) => k.owner_id === id || kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === id)).map((k) => buildKpiView(k, kpiAssignments, checkins, period, id));
  const score = rows.find((r) => r.profile_id === id);
  const rank = rows.findIndex((r) => r.profile_id === id);
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={`${ROLE_LABELS[person.role]}${dir.teamsOf(id).length ? ` · ${dir.teamsOf(id).map((t) => t.name).join(", ")}` : ""}`}
        title={<span className="inline-flex items-center gap-4"><Avatar name={person.full_name} src={person.avatar_url} size="lg" />{person.full_name}</span>}
        description={`${person.job_title || "Geen functie ingesteld"} · lid sinds ${fmtDate(person.created_at)}`}
      >
        <PeriodBar current={period.key} label={period.label} />
      </PageHeader>
      {me && <div className="mb-6"><ProfileEditor profile={person} /></div>}
      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={`${theirGoals.length}`} title={me ? "Mijn doelen" : "Doelen (die jij mag zien)"}>
            {theirGoals.length === 0 ? <p className="text-sm text-muted">Geen zichtbare doelen.</p> : (
              <div className="grid md:grid-cols-2 gap-3">{theirGoals.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} teamName={g.team_id ? dir.teamById.get(g.team_id)?.name : null} compact />)}</div>
            )}
          </Panel>
          <Panel eyebrow={`${theirKpis.length}`} title="KPI's">
            {theirKpis.length === 0 ? <p className="text-sm text-muted">Geen KPI&apos;s.</p> : (
              <div className="grid md:grid-cols-2 gap-3">{theirKpis.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((x) => dir.byId.get(x)!).filter(Boolean)} showCheckin={me} />)}</div>
            )}
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow={period.label} title="Bijdragescore">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Stat label="Punten" value={score?.total ?? 0} tone="cobalt" />
              <Stat label="Positie" value={rank >= 0 ? `#${rank + 1}` : "–"} sub={`van ${rows.length}`} />
            </div>
            <ul className="divide-y divide-line">
              {SCORE_ORDER.filter((k) => score?.breakdown[k]).map((k) => (
                <li key={k} className="py-1.5 flex justify-between text-sm"><span>{SCORE_RULES[k].label} <span className="text-xs text-muted">· {score!.breakdown[k]!.entries}×</span></span><span className="t-num font-semibold">{score!.breakdown[k]!.points}</span></li>
              ))}
              {!score && <li className="py-1.5 text-sm text-muted">Nog geen bijdragen in deze periode.</li>}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}
