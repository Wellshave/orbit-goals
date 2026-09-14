import { notFound } from "next/navigation";
import { Hand, Heart } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PeriodBar } from "@/components/shell/period-bar";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { Panel, SectionHeading, Avatar, Tile } from "@/components/ui";
import { ProfileEditor } from "@/components/people/profile-editor";
import { ROLE_LABELS } from "@/lib/status";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";
import { fmtDate } from "@/lib/format";
import { sendKudos } from "@/app/actions/misc";
import { HelpButton } from "@/components/help/help-button";

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
  const teams = dir.teamsOf(id);

  return (
    <div className="pt-2 flex flex-col gap-8">
      <section className="card-lift p-6 sm:p-8 flex flex-wrap items-center gap-5" style={{ background: "linear-gradient(135deg,#FFFFFF,#ECE5FF)" }}>
        <Avatar name={person.full_name} src={person.avatar_url} size="xl" ring />
        <div className="min-w-0 flex-1">
          <p className="t-label">{ROLE_LABELS[person.role]}{teams.length ? ` · ${teams.map((t) => t.name).join(", ")}` : ""}</p>
          <h1 className="text-3xl sm:text-4xl inline-flex items-start gap-3">{person.full_name}<HelpButton topic="people" className="mt-1.5" /></h1>
          <p className="t-muted mt-1">{person.job_title || "Geen functie ingesteld"} · sinds {fmtDate(person.created_at, "MMMM yyyy")}</p>
        </div>
        {!me && (
          <div className="flex gap-2">
            <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="high_five" /><button type="submit" className="press inline-flex items-center gap-2 rounded-full bg-white text-blue-deep font-semibold text-sm px-4 py-2.5 shadow-[var(--shadow-press)] hover:bg-blue hover:text-white"><Hand className="size-4" aria-hidden /> High-five</button></form>
            <form action={sendKudos}><input type="hidden" name="to_id" value={person.id} /><input type="hidden" name="kind" value="thanks" /><button type="submit" className="press inline-flex items-center gap-2 rounded-full bg-white text-coral-deep font-semibold text-sm px-4 py-2.5 shadow-[var(--shadow-press)] hover:bg-coral hover:text-white"><Heart className="size-4" aria-hidden /> Bedanken</button></form>
          </div>
        )}
      </section>
      <PeriodBar current={period.key} label={period.label} />
      {me && <ProfileEditor profile={person} />}
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-8 min-w-0">
          <section>
            <SectionHeading title={me ? "Mijn doelen" : "Doelen"} sub={me ? undefined : "Alleen doelen die jij mag zien."} />
            {theirGoals.length === 0 ? <p className="text-sm t-muted">Geen zichtbare doelen.</p> : <div className="grid md:grid-cols-2 gap-4">{theirGoals.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} owner={dir.byId.get(g.owner_id)} compact />)}</div>}
          </section>
          <section>
            <SectionHeading title="KPI's" />
            {theirKpis.length === 0 ? <p className="text-sm t-muted">Geen KPI&apos;s.</p> : <div className="grid md:grid-cols-2 gap-4">{theirKpis.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((x) => dir.byId.get(x)!).filter(Boolean)} showCheckin={me} />)}</div>}
          </section>
        </div>
        <aside>
          <Panel eyebrow={period.label} title="Bijdragescore" tone="butter">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Tile tone="yellow" label="Punten" value={score?.total ?? 0} className="bg-white/80" />
              <Tile tone="yellow" label="Positie" value={rank >= 0 ? `#${rank + 1}` : "–"} sub={`van ${rows.length}`} className="bg-white/80" />
            </div>
            <ul className="divide-y divide-line">
              {SCORE_ORDER.filter((k) => score?.breakdown[k]).map((k) => <li key={k} className="py-1.5 flex justify-between text-sm"><span>{SCORE_RULES[k].label} <span className="text-xs t-muted">· {score!.breakdown[k]!.entries}×</span></span><span className="font-bold tnum">{score!.breakdown[k]!.points}</span></li>)}
              {!score && <li className="py-1.5 text-sm t-muted">Nog geen bijdragen in deze periode.</li>}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
