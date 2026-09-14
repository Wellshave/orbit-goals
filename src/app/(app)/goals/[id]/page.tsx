import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil, ArrowUpRight, CornerDownRight, Lock, Users, Building2, Share2 } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { getGoalBundle } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { ProgressPath } from "@/components/instruments/progress-path";
import { ProgressBar } from "@/components/instruments/progress-bar";
import { MilestoneManager } from "@/components/goals/milestone-manager";
import { ProgressForm } from "@/components/goals/progress-form";
import { ActivityFeed } from "@/components/goals/activity-feed";
import { MilestoneCelebration } from "@/components/celebration/milestone-celebration";
import { Panel, StatusPill, Avatar, ButtonLink, Tile } from "@/components/ui";
import { goalIcon } from "@/components/icons";
import { daysLeft, goalProgress, GOAL_TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/status";
import { explainForecast, explainGoal, explainMilestone, nextMilestone, progressLabel } from "@/lib/explain";
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
  const contributors = Array.from(new Set(updates.slice(0, 3).map((u) => u.profile_id))).map((pid) => dir.byId.get(pid)!).filter(Boolean);
  const Vis = VIS_ICON[g.visibility];
  const left = daysLeft(g.deadline);
  const icon = goalIcon(g.goal_type);
  const team = g.team_id ? dir.teamById.get(g.team_id) : null;
  const accent = g.goal_type === "team" ? team?.color ?? "#9B72F2" : g.goal_type === "company" ? "#F6C85F" : "#48CFAE";
  const next = nextMilestone(g, milestones);

  return (
    <div className="pt-2">
      <Suspense fallback={null}><MilestoneCelebration goal={g} milestones={milestones} rewards={rewards} /></Suspense>
      <PageHeader icon={icon.name} tone={icon.tone} eyebrow={`${GOAL_TYPE_LABELS[g.goal_type]}${team ? ` · ${team.name}` : ""} · ${g.category}`} title={g.title} description={g.description || undefined} actions={<><StatusPill status={g.status} progress={goalProgress(g)} />{canManage && <ButtonLink href={`/goals/${g.id}/edit`} variant="secondary" size="sm"><Pencil className="size-3.5" aria-hidden /> Bewerken</ButtonLink>}</>} />

      <section className="card-lift p-6 sm:p-8 mb-8" aria-label="Voortgang">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start mb-4">
          <div>
            <p className="font-display font-extrabold text-3xl sm:text-4xl leading-none">{progressLabel(g)}</p>
            <p className="mt-2 text-lg text-ink-2">{explainGoal(g)}{explainForecast(g) ? ` ${explainForecast(g)}` : ""}</p>
            {next && <p className="mt-1 text-sm font-semibold text-blue-deep">{explainMilestone(g, next)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <Tile tone="grey" label="Deadline" value={fmtDate(g.deadline, "d MMM")} sub={left < 0 && g.status !== "achieved" ? `${Math.abs(left)} dagen geleden` : left >= 0 ? `nog ${left} dagen` : "afgerond"} icon="calendar" />
            <Tile tone="grey" label="Voortgang" value={pct(goalProgress(g))} sub={g.measure === "numeric" ? `target ${fmtCompact(g.target_value, g.unit)}` : FREQUENCY_LABELS[g.frequency]} icon="trend" />
          </div>
        </div>
        <ProgressPath goal={g} milestones={milestones} rewards={rewards} contributors={contributors} lastUpdateAt={updates[0]?.created_at ?? null} accent={accent} />
        {milestones.length === 0 && <div className="mt-4"><ProgressBar goal={g} height="lg" accent={accent} /></div>}
      </section>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel eyebrow="Gesprek" title="Updates en reacties">
            <ActivityFeed goal={g} updates={updates} comments={bundle.comments} reactions={bundle.reactions} recognitions={bundle.recognitions} events={bundle.events} byId={dir.byId} me={profile} canManage={canManage} members={dir.members} />
          </Panel>
        </div>
        <aside className="flex flex-col gap-6 min-w-0">
          {canUpdate && (
            <Panel id="voortgang" eyebrow="Jouw stap" title={g.status === "achieved" ? "Doel behaald" : "Voortgang toevoegen"} tone="mint">
              {g.status === "achieved" && <p className="text-sm t-muted mb-3">Behaald op {fmtDate(g.achieved_at)}. Je kunt nog een correctie toevoegen.</p>}
              <div className="bg-white/80 rounded-2xl p-4"><ProgressForm goal={g} /></div>
            </Panel>
          )}
          <Panel eyebrow="Wie" title="Verantwoordelijk">
            <ul className="flex flex-col gap-3">
              {people.map((p) => (
                <li key={p.id}><Link href={`/people/${p.id}`} className="press flex items-center gap-3 rounded-2xl p-1.5 -m-1.5 hover:bg-cloud"><Avatar name={p.full_name} src={p.avatar_url} size="md" ring /><span className="min-w-0"><span className="block font-bold text-sm truncate">{p.full_name}</span><span className="block text-xs t-muted">{p.orbitRole} · {p.job_title}</span></span></Link></li>
              ))}
            </ul>
            <p className="mt-4 text-xs t-muted flex items-center gap-1.5"><Vis className="size-3.5" aria-hidden /> {VISIBILITY_LABELS[g.visibility]}</p>
            {g.visibility === "shared" && shares.length > 0 && <p className="text-xs t-muted mt-1">Gedeeld met: {shares.map((s) => dir.byId.get(s.profile_id)?.full_name).filter(Boolean).join(", ")}</p>}
          </Panel>
          <Panel eyebrow="Reis" title="Milestones en rewards">
            <MilestoneManager goal={g} milestones={milestones} rewards={rewards} canManage={canManage} />
          </Panel>
          {(bundle.parent || bundle.children.length > 0) && (
            <Panel eyebrow="Samenhang" title="Gekoppelde doelen">
              {bundle.parent && <p className="text-sm mb-2"><span className="t-muted">Draagt bij aan </span><Link href={`/goals/${bundle.parent.id}`} className="font-bold hover:text-blue-deep inline-flex items-center gap-1">{bundle.parent.title} <ArrowUpRight className="size-3.5" aria-hidden /></Link></p>}
              {bundle.children.length > 0 && <ul className="flex flex-col gap-1.5">{bundle.children.map((c) => <li key={c.id} className="text-sm flex items-center gap-1.5"><CornerDownRight className="size-3.5 text-ink-3" aria-hidden /><Link href={`/goals/${c.id}`} className="hover:text-blue-deep truncate">{c.title}</Link><span className="ml-auto text-xs t-muted">{pct(goalProgress(c))}</span></li>)}</ul>}
            </Panel>
          )}
          <details className="card p-5">
            <summary className="cursor-pointer font-display font-extrabold list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">Details en historie <span className="text-xs t-muted font-sans font-medium">{updates.length} updates</span></summary>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="t-muted">Startdatum</dt><dd className="font-semibold">{fmtDate(g.start_date)}</dd>
              <dt className="t-muted">Meetfrequentie</dt><dd className="font-semibold">{FREQUENCY_LABELS[g.frequency]}</dd>
              {g.measure === "numeric" && <><dt className="t-muted">Startwaarde</dt><dd className="font-semibold">{fmtValue(g.start_value, g.unit)}</dd></>}
              <dt className="t-muted">Categorie</dt><dd className="font-semibold">{g.category}</dd>
            </dl>
            {updates.length > 0 && (
              <ol className="mt-4 divide-y divide-line text-xs">
                {updates.slice(0, 12).map((u) => (
                  <li key={u.id} className="py-2 flex justify-between gap-2"><span className="min-w-0"><span className="font-semibold">{dir.byId.get(u.profile_id)?.full_name ?? "?"}</span><span className="t-muted"> · {fmtDate(u.created_at, "d MMM HH:mm")}</span></span><span className="tnum shrink-0"><span className="t-muted">{fmtValue(u.previous_value, g.unit)}</span> → <span className="font-bold">{fmtValue(u.new_value, g.unit)}</span></span></li>
                ))}
              </ol>
            )}
          </details>
        </aside>
      </div>
    </div>
  );
}
