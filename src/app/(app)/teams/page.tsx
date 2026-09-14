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
    <>
      <PageHeader eyebrow={`${dir.teams.length} teams`} title="Teams" description="Voortgang per team: doelen, KPI-status en bijdragen van deze maand." actions={isAdmin ? <ButtonLink href="/teams/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuw team</ButtonLink> : undefined} />
      {dir.teams.length === 0 ? <EmptyState title="Nog geen teams" body="Maak teams aan om teamdoelen en team-KPI's te kunnen toewijzen." action={isAdmin ? <ButtonLink href="/teams/new" size="sm">Team aanmaken</ButtonLink> : undefined} /> : (
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
                <Link href={`/teams/${t.id}`} className="deck p-5 flex gap-4 hover:border-ice/25 transition-colors h-full">
                  <Radial value={avg} size={84} stroke={7} tone="cobalt" label={`Gemiddelde voortgang ${pct(avg)}`}><span className="t-num font-bold text-sm">{pct(avg)}</span></Radial>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display font-semibold text-lg flex items-center gap-2"><span className="size-2.5 rounded-full shrink-0" style={{ background: t.color }} aria-hidden />{t.name}</h2>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <AvatarStack people={members} size="xs" max={5} />
                      <span className="t-num text-xs text-muted">{points} pt · {tg.length} doelen</span>
                    </div>
                    {tk.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="KPI-status">
                        {tk.map((v) => <li key={v.kpi.id} className="inline-flex items-center gap-1 text-[0.6875rem] text-muted"><StatusDot status={v.status} /> {v.kpi.name.length > 22 ? v.kpi.name.slice(0, 22) + "…" : v.kpi.name}<span className="sr-only"> {STATUS_META[v.status].label}</span></li>)}
                      </ul>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
