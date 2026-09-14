import { Flame, Star, Users } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { Segmented } from "@/components/ui/segmented";
import { ScoreTable } from "@/components/scoreboard/score-table";
import { Panel, Stat, Avatar } from "@/components/ui";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";

export const metadata = { title: "Scorebord" };

export default async function ScoreboardPage({ searchParams }: PageProps<"/scoreboard">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "month");
  const team = typeof sp.team === "string" ? sp.team : "";
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const [rows, allRows, goals, kpis] = await Promise.all([
    getScoreboard(supabase, period.from, period.to, team || null),
    getScoreboard(supabase, period.from, period.to),
    listGoals(supabase, org.id),
    listKpis(supabase, org.id),
  ]);
  const [milestones, kpiAssignments, checkins] = await Promise.all([listMilestones(supabase, goals.map((g) => g.id)), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 800 })]);

  const teamStats = dir.teams.map((t) => {
    const members = dir.membersOf(t.id);
    const ids = members.map((m) => m.id);
    const points = allRows.filter((r) => ids.includes(r.profile_id)).reduce((s, r) => s + r.total, 0);
    const teamGoals = goals.filter((g) => g.team_id === t.id);
    const ms = milestones.filter((m) => teamGoals.some((g) => g.id === m.goal_id) && m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to);
    const teamKpis = kpis.filter((k) => k.team_id === t.id || ids.includes(k.owner_id ?? ""));
    const streaks = teamKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period).streak);
    const jointStreak = streaks.length ? Math.min(...streaks) : 0;
    const active = allRows.filter((r) => ids.includes(r.profile_id)).length;
    return { team: t, members, points, milestones: ms.length, jointStreak, active, perMember: members.length ? Math.round(points / members.length) : 0 };
  }).sort((a, b) => b.points - a.points);

  const hrefFor = (t: string) => `/scoreboard?period=${period.key}${period.key === "custom" ? `&from=${sp.from}&to=${sp.to}` : ""}${t ? `&team=${t}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Bijdragen" title="Scorebord" description="Bijdragescores wegen consistentie, tijdigheid, behaalde targets en milestones, niet omzet. Klik op een naam voor de opbouw.">
        <div className="flex flex-col gap-3">
          <PeriodBar current={period.key} label={period.label} />
          <Segmented ariaLabel="Team" value={team} hrefFor={hrefFor} options={[{ value: "", label: "Hele organisatie" }, ...dir.teams.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
      </PageHeader>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <div className="min-w-0">
          <ScoreTable rows={rows} byId={dir.byId} teamsOf={dir.teamsOf} highlight={profile.id} />
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Samen" title="Team achievements">
            <ul className="flex flex-col gap-4">
              {teamStats.map((t) => (
                <li key={t.team.id} className="well p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: t.team.color }} aria-hidden />{t.team.name}</span>
                    <span className="t-num text-sm font-bold">{t.points} <span className="text-muted font-normal text-xs">pt</span></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Milestones" value={<span className="inline-flex items-center gap-1"><Star className="size-3.5 text-orchid-soft" aria-hidden />{t.milestones}</span>} size="sm" />
                    <Stat label="Gez. streak" value={<span className="inline-flex items-center gap-1"><Flame className={`size-3.5 ${t.jointStreak >= 2 ? "text-amber" : "text-muted"}`} aria-hidden />{t.jointStreak}×</span>} size="sm" />
                    <Stat label="Actief" value={<span className="inline-flex items-center gap-1"><Users className="size-3.5 text-muted" aria-hidden />{t.active}/{t.members.length}</span>} size="sm" />
                  </div>
                  <div className="mt-2 flex -space-x-1.5">
                    {t.members.map((m) => <Avatar key={m.id} name={m.full_name} src={m.avatar_url} size="xs" className="ring-2 ring-ink-deep" />)}
                  </div>
                </li>
              ))}
              {teamStats.length === 0 && <li className="text-sm text-muted">Nog geen teams.</li>}
            </ul>
            <p className="text-xs text-muted mt-3">Gezamenlijke streak = het laagste aantal opeenvolgende behaalde periodes over alle KPI&apos;s van het team.</p>
          </Panel>
          <Panel eyebrow="Transparant" title="Zo wordt de score berekend">
            <ul className="flex flex-col divide-y divide-line">
              {SCORE_ORDER.map((k) => (
                <li key={k} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <span><span className="font-semibold">{SCORE_RULES[k].label}</span><span className="block text-xs text-muted">{SCORE_RULES[k].explain}</span></span>
                  <span className="t-num font-semibold shrink-0">+{SCORE_RULES[k].points}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}
