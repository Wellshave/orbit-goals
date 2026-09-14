import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { Segmented } from "@/components/ui/segmented";
import { ScoreTable } from "@/components/scoreboard/score-table";
import { Panel, SectionHeading, Avatar } from "@/components/ui";
import { ClayIcon, type IconName } from "@/components/icons";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";
import { sendKudos } from "@/app/actions/misc";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { ActivityEvent, Kudos, Recognition, Status } from "@/lib/types";
import type { Tone } from "@/lib/status";

export const metadata = { title: "Scorebord" };

function Highlight({ icon, tone, label, who, sub }: { icon: IconName; tone: Tone; label: string; who?: { id: string; full_name: string; avatar_url: string | null } | null; sub: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <ClayIcon name={icon} tone={tone} size="md" />
      <div className="min-w-0 flex-1"><p className="t-label">{label}</p>{who ? <p className="font-bold truncate flex items-center gap-2"><Avatar name={who.full_name} src={who.avatar_url} size="xs" />{who.full_name}</p> : <p className="font-bold">Nog niemand</p>}<p className="text-xs t-muted truncate">{sub}</p></div>
    </div>
  );
}

export default async function ScoreboardPage({ searchParams }: PageProps<"/scoreboard">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "month");
  const team = typeof sp.team === "string" ? sp.team : "";
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const [rows, allRows, goals, kpis, kudosRes, eventsRes, recRes] = await Promise.all([
    getScoreboard(supabase, period.from, period.to, team || null), getScoreboard(supabase, period.from, period.to), listGoals(supabase, org.id), listKpis(supabase, org.id),
    supabase.from("kudos").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("activity_events").select("*").eq("org_id", org.id).eq("kind", "status_change").gte("created_at", period.from.toISOString()).lt("created_at", period.to.toISOString()),
    supabase.from("recognitions").select("*").gte("created_at", period.from.toISOString()).lt("created_at", period.to.toISOString()),
  ]);
  const [milestones, kpiAssignments, checkins] = await Promise.all([listMilestones(supabase, goals.map((g) => g.id)), listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 800 })]);
  const kudos = (kudosRes.data ?? []) as Kudos[];
  const recognitions = (recRes.data ?? []) as Recognition[];
  const statusEvents = (eventsRes.data ?? []) as ActivityEvent[];

  const teamStats = dir.teams.map((t) => {
    const members = dir.membersOf(t.id); const ids = members.map((m) => m.id);
    const points = allRows.filter((r) => ids.includes(r.profile_id)).reduce((s, r) => s + r.total, 0);
    const teamGoals = goals.filter((g) => g.team_id === t.id);
    const ms = milestones.filter((m) => teamGoals.some((g) => g.id === m.goal_id) && m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to);
    const teamKpis = kpis.filter((k) => k.team_id === t.id || ids.includes(k.owner_id ?? ""));
    const streaks = teamKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period).streak);
    return { team: t, members, points, milestones: ms.length, jointStreak: streaks.length ? Math.min(...streaks) : 0, active: allRows.filter((r) => ids.includes(r.profile_id)).length };
  }).sort((a, b) => b.points - a.points);

  // Highlights
  const helpfulCounts = new Map<string, number>();
  for (const k of kudos) helpfulCounts.set(k.from_id, (helpfulCounts.get(k.from_id) ?? 0) + 1);
  for (const r of recognitions) helpfulCounts.set(r.recognized_by, (helpfulCounts.get(r.recognized_by) ?? 0) + 1);
  const helpful = Array.from(helpfulCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const biggest = allRows.map((r) => ({ id: r.profile_id, pts: (r.breakdown.goal_update?.points ?? 0) + (r.breakdown.milestone_achieved?.points ?? 0) })).sort((a, b) => b.pts - a.pts)[0];
  const comebackEvent = statusEvents.find((e) => (e.payload as Record<string, Status>).from === "behind" && ["on_track", "achieved"].includes((e.payload as Record<string, Status>).to));
  const comebackGoal = comebackEvent ? goals.find((g) => g.id === comebackEvent.goal_id) : null;
  const teamOfMonth = teamStats[0];
  const jointMilestones = milestones.filter((m) => m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to).slice(0, 6);
  const hrefFor = (t: string) => `/scoreboard?period=${period.key}${period.key === "custom" ? `&from=${sp.from}&to=${sp.to}` : ""}${t ? `&team=${t}` : ""}`;

  return (
    <div className="pt-2 flex flex-col gap-8">
      <PageHeader icon="trophy" tone="yellow" eyebrow="Samen vooruit" title="Scorebord" description="Punten voor consistentie, tijdigheid, behaalde targets en milestones, niet voor omzet. Klik op een naam voor de opbouw, en geef een high-five.">
        <div className="flex flex-col gap-3">
          <PeriodBar current={period.key} label={period.label} />
          <Segmented ariaLabel="Team" value={team} hrefFor={hrefFor} options={[{ value: "", label: "Hele organisatie" }, ...dir.teams.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
      </PageHeader>

      <section>
        <SectionHeading title="Uitgelicht deze periode" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Highlight icon="collab" tone="purple" label="Meest behulpzaam" who={helpful ? dir.byId.get(helpful[0]) : null} sub={helpful ? `${helpful[1]}× waardering gegeven` : "geef vandaag een high-five"} />
          <Highlight icon="trend" tone="blue" label="Grootste vooruitgang" who={biggest && biggest.pts > 0 ? dir.byId.get(biggest.id) : null} sub={biggest && biggest.pts > 0 ? `${biggest.pts} punten uit voortgang en milestones` : "nog geen voortgang"} />
          <Highlight icon="rocket" tone="coral" label="Mooiste comeback" who={comebackGoal ? dir.byId.get(comebackGoal.owner_id) : null} sub={comebackGoal ? `${comebackGoal.title} van achter naar op koers` : "nog geen comeback"} />
          <div className="card p-4 flex items-center gap-3"><ClayIcon name="trophy" tone="yellow" size="md" /><div className="min-w-0 flex-1"><p className="t-label">Team van de {period.short.toLowerCase()}</p><p className="font-bold truncate">{teamOfMonth ? teamOfMonth.team.name : "Nog geen teams"}</p><p className="text-xs t-muted">{teamOfMonth ? `${teamOfMonth.points} punten samen` : ""}</p></div></div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="min-w-0"><ScoreTable rows={rows} byId={dir.byId} teamsOf={dir.teamsOf} highlight={profile.id} /></div>
        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Samen" title="Teams" tone="lavender">
            <ul className="flex flex-col gap-3">
              {teamStats.map((t) => (
                <li key={t.team.id} className="bg-white/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2"><span className="font-bold text-sm inline-flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: t.team.color }} aria-hidden />{t.team.name}</span><span className="font-display font-extrabold">{t.points} <span className="t-muted text-xs font-sans font-medium">pt</span></span></div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="tile soft-butter py-2"><p className="font-display font-extrabold">{t.milestones}</p><p className="text-[0.6875rem] t-muted">milestones</p></div>
                    <div className="tile soft-peach py-2"><p className="font-display font-extrabold">{t.jointStreak}×</p><p className="text-[0.6875rem] t-muted">teamstreak</p></div>
                    <div className="tile soft-mint py-2"><p className="font-display font-extrabold">{t.active}/{t.members.length}</p><p className="text-[0.6875rem] t-muted">actief</p></div>
                  </div>
                  <div className="mt-2 flex -space-x-2">{t.members.map((m) => <Avatar key={m.id} name={m.full_name} src={m.avatar_url} size="xs" className="ring-2 ring-white" />)}</div>
                </li>
              ))}
              {teamStats.length === 0 && <li className="text-sm t-muted">Nog geen teams.</li>}
            </ul>
          </Panel>
          <Panel eyebrow="Gevierd" title="Gezamenlijk behaalde milestones" tone="butter">
            {jointMilestones.length === 0 ? <p className="text-sm t-muted">Nog geen milestones deze periode.</p> : (
              <ul className="flex flex-col gap-2">
                {jointMilestones.map((m) => { const g = goals.find((x) => x.id === m.goal_id)!; const owner = dir.byId.get(g.owner_id); return (
                  <li key={m.id} className="bg-white/80 rounded-2xl p-3 flex items-center gap-3">
                    <ClayIcon name="flag" tone="yellow" size="sm" />
                    <span className="min-w-0 flex-1"><Link href={`/goals/${g.id}`} className="block font-bold text-sm truncate hover:text-blue-deep">{m.name}</Link><span className="block text-xs t-muted truncate">{g.title} · {fmtDate(m.achieved_at)}</span></span>
                    {owner && owner.id !== profile.id && <form action={sendKudos}><input type="hidden" name="to_id" value={owner.id} /><input type="hidden" name="kind" value="celebrate" /><input type="hidden" name="goal_id" value={g.id} /><button type="submit" className="press text-xs font-semibold rounded-full bg-white border border-line px-3 py-1.5 hover:bg-butter">Vier mee</button></form>}
                  </li>
                ); })}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Lief" title="Recente complimenten">
            {kudos.length === 0 && recognitions.length === 0 ? <p className="text-sm t-muted">Nog geen complimenten. Wees de eerste.</p> : (
              <ul className="flex flex-col gap-3">
                {kudos.slice(0, 6).map((k) => { const from = dir.byId.get(k.from_id); const to = dir.byId.get(k.to_id); return (
                  <li key={k.id} className="flex items-start gap-2.5 text-sm"><Avatar name={from?.full_name ?? "?"} src={from?.avatar_url} size="sm" ring /><span className="min-w-0"><span className="block"><span className="font-bold">{from?.full_name.split(" ")[0]}</span> {k.kind === "high_five" ? "gaf een high-five aan" : k.kind === "thanks" ? "bedankte" : "vierde mee met"} <span className="font-bold">{to?.full_name.split(" ")[0]}</span></span>{k.message && <span className="block text-xs t-muted">“{k.message}”</span>}<span className="block text-xs t-muted">{fmtRelative(k.created_at)}</span></span></li>
                ); })}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Transparant" title="Zo tellen punten">
            <ul className="divide-y divide-line">
              {SCORE_ORDER.map((k) => <li key={k} className="py-2 flex items-start justify-between gap-3 text-sm"><span><span className="font-semibold">{SCORE_RULES[k].label}</span><span className="block text-xs t-muted">{SCORE_RULES[k].explain}</span></span><span className="font-bold shrink-0 text-blue-deep">+{SCORE_RULES[k].points}</span></li>)}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
