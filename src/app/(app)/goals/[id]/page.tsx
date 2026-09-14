import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Lock, Users, Building2, Share2, Pencil, ArrowUpRight, CornerDownRight } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { getGoalBundle } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalOrbit } from "@/components/orbit/goal-orbit";
import { TrajectoryBar } from "@/components/instruments/trajectory-bar";
import { MilestoneTrack } from "@/components/instruments/milestone-track";
import { MilestoneManager } from "@/components/goals/milestone-manager";
import { ProgressForm } from "@/components/goals/progress-form";
import { ActivityFeed } from "@/components/goals/activity-feed";
import { MilestoneCelebration } from "@/components/celebration/milestone-celebration";
import { Panel, Stat, StatusPill, Avatar, ButtonLink } from "@/components/ui";
import { daysLeft, goalExpected, goalForecast, goalProgress, GOAL_TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/status";
import { fmtDate, fmtValue, pct, fmtCompact } from "@/lib/format";
import { FREQUENCY_LABELS } from "@/lib/periods";

const VIS_ICON = { private: Lock, shared: Share2, team: Users, company: Building2 } as const;

export default async function GoalPage({ params }: PageProps<"/goals/[id]">) {
  const { id } = await params;
  const { supabase, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const bundle = await getGoalBundle(supabase, id);
  if (!bundle) notFound();
  const { goal: g, milestones, rewards, assignments, shares, updates } = bundle;

  const canManage = g.owner_id === profile.id || g.created_by === profile.id || (isAdmin && (g.visibility === "team" || g.visibility === "company")) || shares.some((s) => s.profile_id === profile.id && s.can_edit);
  const canUpdate = canManage || assignments.some((a) => a.profile_id === profile.id);
  const owner = dir.byId.get(g.owner_id);
  const people = [owner, ...assignments.map((a) => dir.byId.get(a.profile_id))].filter((p, i, arr) => p && arr.findIndex((x) => x?.id === p.id) === i).map((p) => ({ ...p!, orbitRole: p!.id === g.owner_id ? "eigenaar" : "verantwoordelijk" }));
  const Vis = VIS_ICON[g.visibility];
  const left = daysLeft(g.deadline);
  const forecast = goalForecast(g);
  const prevValue = updates.length > 1 ? Number(updates[1].new_value) : updates.length === 1 ? Number(updates[0].previous_value) : null;

  return (
    <>
      <Suspense fallback={null}>
        <MilestoneCelebration goal={g} milestones={milestones} rewards={rewards} />
      </Suspense>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><Vis className="size-3" aria-hidden />{GOAL_TYPE_LABELS[g.goal_type]}{g.team_id ? ` · ${dir.teamById.get(g.team_id)?.name}` : ""} · {g.category}</span>}
        title={g.title}
        description={g.description || undefined}
        actions={
          <>
            <StatusPill status={g.status} />
            {canManage && <ButtonLink href={`/goals/${g.id}/edit`} variant="secondary" size="sm"><Pencil className="size-3.5" aria-hidden /> Bewerken</ButtonLink>}
          </>
        }
      />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <section className="deck-raised p-5 sm:p-6 grid lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start" aria-label="Goal Orbit">
            <GoalOrbit goal={g} milestones={milestones} rewards={rewards} people={people} lastUpdateAt={updates[0]?.created_at ?? null} size={380} />
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Huidige stand" value={g.measure === "binary" ? (g.current_value >= 1 ? "Behaald" : "Open") : fmtCompact(g.current_value, g.unit)} size="md" />
                <Stat label="Target" value={g.measure === "binary" ? "Klaar" : fmtCompact(g.target_value, g.unit)} size="md" tone="muted" />
                <Stat label="Voortgang" value={pct(goalProgress(g))} sub={g.status !== "achieved" ? `verwacht ${pct(goalExpected(g))}` : "behaald"} size="sm" tone={g.status === "achieved" ? "orchid" : g.status === "behind" ? "coral" : "cobalt"} />
                <Stat label="Verwachte eindwaarde" value={forecast === null ? "–" : fmtCompact(forecast, g.unit)} sub="bij huidig tempo" size="sm" tone={forecast !== null && ((g.target_value >= g.start_value && forecast >= g.target_value) || (g.target_value < g.start_value && forecast <= g.target_value)) ? "cobalt" : "amber"} />
                <Stat label="Deadline" value={fmtDate(g.deadline, "d MMM yyyy")} sub={left < 0 ? `${Math.abs(left)} dagen geleden` : `nog ${left} dagen`} size="sm" tone={left < 0 && g.status !== "achieved" ? "coral" : "muted"} />
                <Stat label="Meting" value={FREQUENCY_LABELS[g.frequency]} sub={`sinds ${fmtDate(g.start_date)}`} size="sm" tone="muted" />
              </div>
              <div className="mt-5">
                <TrajectoryBar goal={g} milestones={milestones} previous={prevValue} />
              </div>
              {milestones.length > 0 && (
                <div className="mt-5">
                  <p className="t-eyebrow mb-2">Milestones</p>
                  <MilestoneTrack goal={g} milestones={milestones} rewards={rewards} />
                </div>
              )}
            </div>
          </section>

          <Panel eyebrow="Communicatie" title="Activiteit, updates en reacties">
            <ActivityFeed goal={g} updates={updates} comments={bundle.comments} reactions={bundle.reactions} recognitions={bundle.recognitions} events={bundle.events} byId={dir.byId} me={profile} canManage={canManage} members={dir.members} />
          </Panel>
        </div>

        <aside className="flex flex-col gap-6 min-w-0">
          {canUpdate && g.status !== "achieved" ? (
            <Panel eyebrow="Voortgang" title="Voortgang toevoegen">
              <ProgressForm goal={g} />
            </Panel>
          ) : canUpdate ? (
            <Panel eyebrow="Voortgang" title="Doel behaald">
              <p className="text-sm text-muted">Behaald op {fmtDate(g.achieved_at)}. Je kunt nog steeds een correctie toevoegen.</p>
              <div className="mt-3"><ProgressForm goal={g} /></div>
            </Panel>
          ) : null}

          <Panel eyebrow="Mensen" title="Wie is verantwoordelijk">
            <ul className="flex flex-col gap-2.5">
              {people.map((p) => (
                <li key={p.id}>
                  <Link href={`/people/${p.id}`} className="flex items-center gap-2.5 rounded-[4px] p-1 -m-1 hover:bg-ice/5">
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                    <span className="min-w-0"><span className="block text-sm font-semibold truncate">{p.full_name}</span><span className="block text-xs text-muted">{p.orbitRole} · {p.job_title}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted flex items-center gap-1.5"><Vis className="size-3" aria-hidden /> {VISIBILITY_LABELS[g.visibility]}</p>
            {g.visibility === "shared" && shares.length > 0 && (
              <p className="text-xs text-muted mt-1">Gedeeld met: {shares.map((s) => dir.byId.get(s.profile_id)?.full_name).filter(Boolean).join(", ")}</p>
            )}
          </Panel>

          <Panel eyebrow="Milestones & rewards" title="Tussendoelen">
            <MilestoneManager goal={g} milestones={milestones} rewards={rewards} canManage={canManage} />
          </Panel>

          {(bundle.parent || bundle.children.length > 0) && (
            <Panel eyebrow="Structuur" title="Gekoppelde doelen">
              {bundle.parent && (
                <p className="text-sm mb-2"><span className="text-muted">Draagt bij aan </span><Link href={`/goals/${bundle.parent.id}`} className="font-semibold hover:text-cobalt-soft inline-flex items-center gap-1">{bundle.parent.title} <ArrowUpRight className="size-3.5" aria-hidden /></Link></p>
              )}
              {bundle.children.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {bundle.children.map((c) => (
                    <li key={c.id} className="text-sm flex items-center gap-1.5"><CornerDownRight className="size-3.5 text-muted" aria-hidden /><Link href={`/goals/${c.id}`} className="hover:text-cobalt-soft truncate">{c.title}</Link><span className="ml-auto t-num text-xs text-muted">{pct(goalProgress(c))}</span></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel eyebrow="Historie" title="Wie heeft wat aangepast">
            {updates.length === 0 ? <p className="text-sm text-muted">Nog geen updates.</p> : (
              <ol className="flex flex-col divide-y divide-line text-xs">
                {updates.slice(0, 10).map((u) => (
                  <li key={u.id} className="py-2 grid grid-cols-[1fr_auto] gap-2">
                    <span className="min-w-0"><span className="font-semibold text-ice">{dir.byId.get(u.profile_id)?.full_name ?? "?"}</span><span className="text-muted"> · {fmtDate(u.created_at, "d MMM HH:mm")}</span>{u.note && <span className="block text-muted truncate">{u.note}</span>}</span>
                    <span className="t-num text-right"><span className="text-muted">{fmtValue(u.previous_value, g.unit)}</span> → <span className="font-semibold">{fmtValue(u.new_value, g.unit)}</span></span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
