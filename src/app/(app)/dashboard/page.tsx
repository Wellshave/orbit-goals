import Link from "next/link";
import { AtSign, Award, Plus, Star } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, previousPeriod } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { GoalCard } from "@/components/goals/goal-card";
import { KpiCard } from "@/components/kpis/kpi-card";
import { CheckinForm } from "@/components/kpis/checkin-form";
import { Panel, Stat, EmptyState, ButtonLink, Avatar } from "@/components/ui";
import { STATUS_ORDER } from "@/lib/status";
import { fmtRelative, fmtValue } from "@/lib/format";
import { periodLabel } from "@/lib/periods";
import type { Milestone, Notification, SavedFilter } from "@/lib/types";

export const metadata = { title: "Mijn dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "week");
  const prev = previousPeriod(period);
  const { supabase, profile, org } = await getSession();
  const dir = await getDirectory();

  const [goals, kpis, filtersRes, notifRes, scoreRows] = await Promise.all([
    listGoals(supabase, org.id),
    listKpis(supabase, org.id),
    supabase.from("saved_filters").select("*").eq("profile_id", profile.id).order("created_at"),
    supabase.from("notifications").select("*").eq("recipient_id", profile.id).in("kind", ["mention", "reply", "recognition"]).order("created_at", { ascending: false }).limit(6),
    getScoreboard(supabase, period.from, period.to),
  ]);
  const goalIds = goals.map((g) => g.id);
  const [assignments, milestones, kpiAssignments, checkins] = await Promise.all([
    listAssignments(supabase, goalIds),
    listMilestones(supabase, goalIds),
    listKpiAssignments(supabase, kpis.map((k) => k.id)),
    listCheckins(supabase, kpis.map((k) => k.id), { from: prev.from }),
  ]);

  const mine = goals.filter((g) => g.owner_id === profile.id || assignments.some((a) => a.goal_id === g.id && a.profile_id === profile.id));
  const personal = mine.filter((g) => g.goal_type === "personal");
  const assigned = mine.filter((g) => g.goal_type !== "personal");
  const priorities = [...mine].filter((g) => g.status !== "achieved").sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.deadline.localeCompare(b.deadline)).slice(0, 4);

  const myKpis = kpis.filter((k) => kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === profile.id) || k.owner_id === profile.id);
  const views = myKpis.map((k) => buildKpiView(k, kpiAssignments, checkins, period, profile.id));
  const openCheckins = views.filter((v) => !v.openPeriod.done && kpiAssignments.some((a) => a.kpi_id === v.kpi.id && a.profile_id === profile.id));

  const recentMilestones = milestones.filter((m) => m.status === "achieved" && m.achieved_at && new Date(m.achieved_at) >= period.from && new Date(m.achieved_at) < period.to && mine.some((g) => g.id === m.goal_id));
  const myScore = scoreRows.find((r) => r.profile_id === profile.id);
  const myRank = scoreRows.findIndex((r) => r.profile_id === profile.id);
  const bestStreak = views.reduce((m, v) => Math.max(m, v.streak), 0);
  const atRisk = mine.filter((g) => g.status === "behind" || g.status === "needs_attention").length;
  const notifications = (notifRes.data ?? []) as Notification[];

  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  return (
    <>
      <PageHeader
        eyebrow={`${greet}, ${profile.full_name.split(" ")[0]}`}
        title="Mijn dashboard"
        description="Alleen wat jij mag zien: eigen prioriteiten, KPI's van deze periode, toegewezen doelen en open check-ins."
        actions={
          <>
            <ButtonLink href="/goals/new" variant="secondary" size="sm"><Plus className="size-4" aria-hidden /> Doel</ButtonLink>
            <ButtonLink href="/kpis/new" variant="secondary" size="sm"><Plus className="size-4" aria-hidden /> KPI</ButtonLink>
            <ButtonLink href="/checkin" size="sm">Check-ins invullen{openCheckins.length ? ` (${openCheckins.length})` : ""}</ButtonLink>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <PeriodBar current={period.key} label={period.label} />
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>

      <section className="deck p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6" aria-label="Kerngetallen">
        <Stat label={`Mijn score · ${period.short.toLowerCase()}`} value={myScore?.total ?? 0} sub={myRank >= 0 ? `#${myRank + 1} van ${scoreRows.length}` : "nog geen bijdragen"} tone="cobalt" />
        <Stat label="Open check-ins" value={openCheckins.length} sub={openCheckins.length ? "wachten op jou" : "alles ingevuld"} tone={openCheckins.length ? "amber" : "ice"} />
        <Stat label="Beste streak" value={`${bestStreak}×`} sub="periodes op rij target gehaald" tone="orchid" />
        <Stat label="Doelen met risico" value={atRisk} sub={`van ${mine.length} doelen`} tone={atRisk ? "coral" : "ice"} />
      </section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Prioriteiten" title="Waar je aandacht nu naartoe moet" actions={<Link href="/goals" className="text-xs font-semibold text-cobalt-soft hover:underline">Alle doelen</Link>}>
            {priorities.length === 0 ? (
              <EmptyState compact title="Nog geen doelen" body="Maak je eerste persoonlijke doel of vraag een admin om je aan een teamdoel te koppelen." action={<ButtonLink href="/goals/new" size="sm">Eerste doel aanmaken</ButtonLink>} />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {priorities.map((g) => (
                  <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} teamName={g.team_id ? dir.teamById.get(g.team_id)?.name : null} compact />
                ))}
              </div>
            )}
          </Panel>

          <Panel eyebrow={period.label} title="KPI's voor deze periode" actions={<Link href="/kpis" className="text-xs font-semibold text-cobalt-soft hover:underline">Alle KPI&apos;s</Link>}>
            {views.length === 0 ? (
              <EmptyState compact title="Geen KPI's toegewezen" body="Een admin kan KPI's aan je toewijzen, of maak zelf een persoonlijke KPI." action={<ButtonLink href="/kpis/new" size="sm" variant="secondary">Persoonlijke KPI aanmaken</ButtonLink>} />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {views.map((v) => (
                  <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} teamName={v.kpi.team_id ? dir.teamById.get(v.kpi.team_id)?.name : null} />
                ))}
              </div>
            )}
          </Panel>

          {personal.length > 0 && (
            <Panel eyebrow="Persoonlijk" title="Mijn persoonlijke doelen">
              <div className="grid md:grid-cols-2 gap-3">
                {personal.map((g) => (
                  <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} compact />
                ))}
              </div>
            </Panel>
          )}
          {assigned.length > 0 && (
            <Panel eyebrow="Toegewezen" title="Team- en company goals waar ik aan bijdraag">
              <div className="grid md:grid-cols-2 gap-3">
                {assigned.map((g) => (
                  <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} teamName={g.team_id ? dir.teamById.get(g.team_id)?.name : null} compact />
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Actie" title="Openstaande check-ins">
            {openCheckins.length === 0 ? (
              <p className="text-sm text-muted">Alles is ingevuld. Sterk.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {openCheckins.slice(0, 4).map((v) => (
                  <li key={v.kpi.id} className="py-3">
                    <p className="text-sm font-semibold leading-snug">{v.kpi.name}</p>
                    <p className="text-[0.6875rem] text-muted t-num mb-2">{periodLabel(v.kpi.frequency, v.openPeriod.start)} · target {fmtValue(v.kpi.target_value, v.kpi.unit)}</p>
                    <CheckinForm kpi={v.kpi} period={v.openPeriod} compact />
                  </li>
                ))}
                {openCheckins.length > 4 && <li className="pt-3"><Link href="/checkin" className="text-xs font-semibold text-cobalt-soft">Nog {openCheckins.length - 4} meer →</Link></li>}
              </ul>
            )}
          </Panel>

          <Panel eyebrow={period.label} title="Recent behaalde milestones">
            {recentMilestones.length === 0 ? (
              <p className="text-sm text-muted">Geen milestones behaald in deze periode.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentMilestones.map((m: Milestone) => {
                  const g = goals.find((x) => x.id === m.goal_id)!;
                  return (
                    <li key={m.id}>
                      <Link href={`/goals/${g.id}?celebrate=${m.id}`} className="flex items-start gap-2.5 rounded-[4px] p-1.5 -m-1.5 hover:bg-ice/5">
                        <span className="grid place-items-center size-7 rounded-full bg-orchid text-white shrink-0" aria-hidden><Star className="size-3.5" /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold truncate">{m.name}</span>
                          <span className="block text-xs text-muted truncate">{g.title} · {fmtRelative(m.achieved_at!)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="Communicatie" title="Reacties en vermeldingen" actions={<Link href="/notifications" className="text-xs font-semibold text-cobalt-soft hover:underline">Alles</Link>}>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">Nog niemand heeft je genoemd.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {notifications.map((n) => {
                  const actor = n.actor_id ? dir.byId.get(n.actor_id) : null;
                  return (
                    <li key={n.id}>
                      <Link href={n.href} className={`flex items-start gap-2.5 rounded-[4px] p-1.5 -m-1.5 hover:bg-ice/5 ${!n.read_at ? "" : "opacity-70"}`}>
                        {actor ? <Avatar name={actor.full_name} src={actor.avatar_url} size="xs" /> : <span className="size-6 grid place-items-center text-muted">{n.kind === "recognition" ? <Award className="size-3.5" /> : <AtSign className="size-3.5" />}</span>}
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-snug">{n.title}</span>
                          <span className="block text-xs text-muted truncate">{n.body}</span>
                          <span className="block text-[0.6875rem] text-muted t-num">{fmtRelative(n.created_at)}</span>
                        </span>
                        {!n.read_at && <span className="ml-auto mt-1.5 size-1.5 rounded-full bg-coral shrink-0" aria-label="ongelezen" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
