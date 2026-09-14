import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { listGoals } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { AvatarStack, ButtonLink, EmptyState, StatusDot } from "@/components/ui";
import { Radial } from "@/components/instruments/radial";
import { goalProgress, STATUS_META } from "@/lib/status";
import { pct } from "@/lib/format";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const { supabase, org, isAdmin } = await getSession();
  const dir = await getDirectory();
  const period = resolvePeriod({}, "month");
  const [goals, kpis, rows] = await Promise.all([listGoals(supabase, org.id), listKpis(supabase, org.id), getScoreboard(supabase, period.from, period.to)]);
  const [kpiAssignments, checkins] = await Promise.all([listKpiAssignments(supabase, kpis.map((k) => k.id)), listCheckins(supabase, kpis.map((k) => k.id), { limit: 600 })]);
  return (
    <div className="pt-2">
      <PageHeader help="teams" icon="team" tone="purple" eyebrow={`${dir.teams.length} teams`} title="Waar de teams aan werken" description="Voortgang per team: doelen, KPI-status en punten van deze maand." actions={isAdmin ? <ButtonLink href="/teams/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuw team</ButtonLink> : undefined} />
      {dir.teams.length === 0 ? <EmptyState icon="team" tone="purple" title="Nog geen teams" body="Maak teams aan om teamdoelen en team-KPI's te kunnen toewijzen." action={isAdmin ? <ButtonLink href="/teams/new" size="sm">Team aanmaken</ButtonLink> : undefined} /> : (
        <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dir.teams.map((t) => {
            const members = dir.membersOf(t.id);
            const tg = goals.filter((g) => g.team_id === t.id);
            const active = tg.filter((g) => g.status !== "achieved");
            const avg = active.length ? active.reduce((s, g) => s + Math.min(1, goalProgress(g)), 0) / active.length : tg.length ? 1 : 0;
            const tk = kpis.filter((k) => k.team_id === t.id).map((k) => buildKpiView(k, kpiAssignments, checkins, period));
            const points = rows.filter((r) => members.some((m) => m.id === r.profile_id)).reduce((s, r) => s + r.total, 0);
            return (
              <li key={t.id}>
                <Link href={`/teams/${t.id}`} className="card hover-lift p-5 flex gap-4 h-full" style={{ borderTop: `4px solid ${t.color}` }}>
                  <Radial value={avg} size={84} stroke={9} tone="purple" label={`Gemiddelde voortgang ${pct(avg)}`}><span className="font-display font-extrabold text-sm">{pct(avg)}</span></Radial>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl">{t.name}</h2>
                    <p className="text-sm t-muted mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2"><AvatarStack people={members} size="sm" max={5} /><span className="text-xs t-muted">{points} pt · {tg.length} doelen</span></div>
                    {tk.length > 0 && <ul className="mt-3 flex flex-wrap gap-2" aria-label="KPI-status">{tk.map((v) => <li key={v.kpi.id} className="inline-flex items-center gap-1.5 text-xs t-muted bg-cloud rounded-full px-2 py-0.5"><StatusDot status={v.status} /> {v.kpi.name.length > 22 ? v.kpi.name.slice(0, 22) + "…" : v.kpi.name}<span className="sr-only"> {STATUS_META[v.status].label}</span></li>)}</ul>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
