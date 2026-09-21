import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { Goal, Milestone, Profile, Team } from "@/lib/types";
import type { KpiView } from "@/lib/data/kpis";
import type { EventGroup } from "@/lib/data/person";
import { ClayIcon, TONE_STYLE, type IconName } from "@/components/icons";
import { Avatar, AvatarStack, StatusPill } from "@/components/ui";
import { RatioBar } from "@/components/instruments/progress-bar";
import { effectiveFormat, goalVisual } from "@/lib/goals/formats";
import { clamp, fmtDate, fmtRelative, fmtValue } from "@/lib/format";
import { goalProgress, milestonePosition } from "@/lib/status";
import { explainMilestone, nextMilestone, progressLabel } from "@/lib/explain";
import { periodWord } from "@/lib/periods";
import type { Locale, T } from "@/lib/i18n";
import type { Tone } from "@/lib/status";

/* ─────────────────────────────── Momentum Ribbon ─────────────────────────────── */

export interface RibbonSegment { key: string; label: string; value: string; sub?: string; tone: Tone; href?: string }

/** Eén doorlopend oppervlak met vier segmenten, dividers en een verbindende lijn. Het urgente segment pulst. */
export function MomentumRibbon({ segments, emphasis, ariaLabel }: { segments: RibbonSegment[]; emphasis: string; ariaLabel: string }) {
  return (
    <section aria-label={ariaLabel} className="surface relative overflow-hidden" data-tour="momentum-ribbon">
      {/* verbindingslijn door de punten; geeft de ribbon één visuele beweging */}
      <div aria-hidden className="hidden md:block absolute left-10 right-10 top-[30px] h-[2px] rounded-full" style={{ background: "linear-gradient(90deg,#48CFAE55,#5B6CFF55,#9B72F255,#F6C85F66)" }} />
      <ul className="ribbon-scroll relative flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory divide-x divide-line">
        {segments.map((s) => {
          const hot = s.key === emphasis;
          const hex = TONE_STYLE[s.tone].hex;
          const inner = (
            <>
              <span className={`ribbon-dot block size-3 rounded-full ring-4 ring-white ${hot ? "ribbon-pulse" : ""}`} style={{ background: hex, color: hex }} aria-hidden />
              <span className="block text-xs font-semibold t-muted mt-3">{s.label}</span>
              <span className={`block font-display font-extrabold leading-tight mt-0.5 ${hot ? "text-xl text-ink" : "text-lg text-ink"}`}>{s.value}</span>
              {s.sub && <span className={`block text-xs mt-0.5 ${hot ? "font-semibold" : "t-muted"}`} style={hot ? { color: `color-mix(in oklab, ${hex} 75%, #172033)` } : undefined}>{s.sub}</span>}
            </>
          );
          return (
            <li key={s.key} className={`snap-start shrink-0 min-w-[68%] sm:min-w-[42%] md:min-w-0 ${hot ? "" : ""}`} style={hot ? { background: `linear-gradient(180deg, color-mix(in oklab, ${hex} 12%, transparent), transparent 85%)` } : undefined}>
              {s.href ? <Link href={s.href} className="block px-5 sm:px-6 pt-5 pb-4 h-full hover:bg-white/60 rounded-none">{inner}</Link> : <div className="px-5 sm:px-6 pt-5 pb-4 h-full">{inner}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────────────────────── Voortgangsspoor ─────────────────────────────── */

/** Ingezonken baan met glanzende vulling, milestonepunten en een zwevende positiemarker. */
export function JourneyTrack({ goal, milestones, accent, label }: { goal: Goal; milestones: Milestone[]; accent: string; label: string }) {
  const p = clamp(goalProgress(goal), 0, 1);
  const marks = milestones
    .map((m) => ({ m, pos: clamp(milestonePosition(goal, m.target_value), 0, 1) }))
    .filter((x) => x.pos > 0.001 && x.pos < 0.999)
    .sort((a, b) => a.pos - b.pos);
  return (
    <div className="journey-track mt-3" role="img" aria-label={label} style={{ ["--journey-accent" as string]: `${accent}80` }}>
      <div className="journey-fill" style={{ width: `${Math.max(p * 100, p > 0 ? 3 : 0)}%`, background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 55%, white), ${accent})` }} />
      {marks.map(({ m, pos }) => {
        const done = m.status === "achieved" || pos <= p;
        return <span key={m.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full border-2" style={{ left: `${pos * 100}%`, background: done ? accent : "#fff", borderColor: done ? "#fff" : `color-mix(in oklab, ${accent} 55%, #D0D5DD)` }} />;
      })}
      <span className="absolute top-1/2 -translate-x-1/2 -translate-y-[62%] size-[18px] rounded-full bg-white border-[3px]" style={{ left: `${p * 100}%`, borderColor: accent, boxShadow: `0 4px 10px -3px ${accent}99, 0 1px 0 rgba(255,255,255,.9) inset` }} />
      <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full" style={{ background: p >= 1 ? accent : "#D0D5DD" }} aria-hidden />
    </div>
  );
}

export function accentOf(goal: Goal, team?: Team | null): string {
  if (goal.goal_type === "team" && team?.color) return team.color;
  return TONE_STYLE[goalVisual(goal).tone].hex;
}

/* ─────────────────────────────── Doelrij ─────────────────────────────── */

export function GoalJourneyRow({ goal, milestones, t, locale, canUpdate, team }: { goal: Goal; milestones: Milestone[]; t: T; locale: Locale; canUpdate: boolean; team?: Team | null }) {
  const icon = goalVisual(goal);
  const accent = accentOf(goal, team);
  const next = nextMilestone(goal, milestones);
  const done = goal.status === "achieved";
  const ctx = [t(`goalFormat.${effectiveFormat(goal)}.name`), goal.category].filter(Boolean).join(" · ");
  return (
    <li className="py-5 first:pt-0 last:pb-0 grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4">
      <ClayIcon name={icon.name} tone={icon.tone} size="md" color={goal.goal_type === "team" ? team?.color : undefined} className="mt-0.5" />
      <div className="min-w-0">
        <Link href={`/goals/${goal.id}`} className="font-display font-extrabold text-[1.0625rem] leading-snug hover:text-blue-deep">{goal.title}</Link>
        <p className="text-xs t-muted mt-0.5 truncate">{ctx}</p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-extrabold text-lg leading-none">{progressLabel(t, goal)}</p>
          <span className="md:hidden"><StatusPill status={goal.status} progress={goalProgress(goal)} size="xs" /></span>
        </div>
        <JourneyTrack goal={goal} milestones={milestones} accent={accent} label={t("pd.trackAria", { p: Math.round(clamp(goalProgress(goal)) * 100) })} />
        <p className="text-xs t-muted mt-2.5">
          {done ? t("goalCard.achieved") : next ? t("pd.nextMs", { m: next.name }) : t("pd.noNextMs")}
          {!done && <> · {t("pd.until", { d: fmtDate(goal.deadline, "d MMM", locale) })}</>}
        </p>
      </div>
      <div className="hidden md:flex flex-col items-end justify-between gap-3 pl-2">
        <StatusPill status={goal.status} progress={goalProgress(goal)} size="xs" />
        <Link href={canUpdate && !done ? `/goals/${goal.id}#voortgang` : `/goals/${goal.id}`} className="press inline-flex items-center gap-1 text-sm font-semibold text-blue-deep rounded-full px-3 py-1.5 hover:bg-sky">
          {canUpdate && !done ? t("pd.update") : t("pd.open")} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

/* ─────────────────────────────── Teamlane ─────────────────────────────── */

export function TeamLane({ goal, milestones, team, people, relation, t }: { goal: Goal; milestones: Milestone[]; team?: Team | null; people: Profile[]; relation: string; t: T }) {
  const icon = goalVisual(goal);
  const accent = accentOf(goal, team);
  const next = nextMilestone(goal, milestones);
  return (
    <li className="py-4 first:pt-0 last:pb-0 grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4 items-start">
      <ClayIcon name={icon.name} tone={icon.tone} size="sm" color={team?.color} className="mt-0.5" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/goals/${goal.id}`} className="font-semibold leading-snug hover:text-blue-deep">{goal.title}</Link>
          <span className="text-[0.6875rem] font-semibold rounded-full px-2 py-0.5" style={{ background: `color-mix(in oklab, ${accent} 16%, white)`, color: `color-mix(in oklab, ${accent} 70%, #172033)` }}>{team?.name ?? t("goalCard.wholeCompany")}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-sm font-bold tnum whitespace-nowrap">{progressLabel(t, goal)}</span>
          <div className="flex-1 min-w-16 h-1.5 rounded-full bg-cloud overflow-hidden" aria-hidden><div className="h-full rounded-full" style={{ width: `${clamp(goalProgress(goal)) * 100}%`, background: accent }} /></div>
        </div>
        <p className="text-sm text-ink mt-1.5">{relation}</p>
        {next && <p className="text-xs t-muted mt-0.5">{explainMilestone(t, goal, next)}</p>}
      </div>
      <div className="hidden sm:flex flex-col items-end gap-2 pl-2">
        <AvatarStack people={people} size="xs" max={4} />
        <StatusPill status={goal.status} progress={goalProgress(goal)} size="xs" />
      </div>
    </li>
  );
}

/* ─────────────────────────────── Tijdlijn ─────────────────────────────── */

export function eventSentence(g: EventGroup, ctx: { t: T; goalTitle: (id: string | null) => string; nameOf: (id: string) => string; viewerId: string }): string {
  const { t } = ctx;
  const title = ctx.goalTitle(g.goalId);
  const others = g.assignees.filter((a) => a !== g.actorId).map((a) => (a === ctx.viewerId ? t("pd.youObj") : ctx.nameOf(a)));
  const names = others.join(` ${t("pd.and")} `);
  const tailComment = g.kinds.has("comment") ? t("pd.andCommented") : "";
  if (g.kinds.has("goal_created")) return names ? t("pd.evCreatedAssigned", { g: title, names }) : t("pd.evCreated", { g: title });
  if (g.kinds.has("goal_achieved")) return t("pd.evAchieved", { g: title });
  if (g.kinds.has("milestone_achieved")) return t("pd.evMilestone", { m: g.milestoneName ?? "", g: title });
  if (g.kinds.has("goal_update")) { const n = g.counts.goal_update ?? 1; return (n > 1 ? t("pd.evUpdatedN", { g: title, n }) : t("pd.evUpdated", { g: title })) + tailComment; }
  if (g.kinds.has("comment")) { const n = g.counts.comment ?? 1; return n > 1 ? t("pd.evCommentN", { g: title, n }) : t("pd.evComment", { g: title }); }
  if (g.kinds.has("kpi_checkin")) { const n = g.counts.kpi_checkin ?? 1; return n > 1 ? t("pd.evCheckinN", { n }) : t("pd.evCheckin"); }
  if (g.kinds.has("assignment")) return names ? t("pd.evAssigned", { g: title, names }) : t("pd.evJoined", { g: title });
  return t("pd.evUpdated", { g: title });
}

export function ActivityTimeline({ groups, visible, byId, viewerId, t, locale, goalTitle }: { groups: EventGroup[]; visible: number; byId: Map<string, Profile>; viewerId: string; t: T; locale: Locale; goalTitle: (id: string | null) => string }) {
  const nameOf = (id: string) => byId.get(id)?.full_name.split(" ")[0] ?? t("dashboard.someone");
  const item = (g: EventGroup) => {
    const actor = g.actorId ? byId.get(g.actorId) : undefined;
    return (
      <li key={g.key} className="relative pl-11">
        <span className="absolute left-0 top-0"><Avatar name={actor?.full_name ?? "?"} src={actor?.avatar_url} size="sm" className="ring-4 ring-white" /></span>
        <p className="text-sm leading-snug">
          <span className="font-semibold">{g.actorId === viewerId ? t("pd.you") : actor?.full_name.split(" ")[0] ?? t("dashboard.someone")}</span>{" "}
          {g.goalId ? <Link href={`/goals/${g.goalId}`} className="hover:text-blue-deep">{eventSentence(g, { t, goalTitle, nameOf, viewerId })}</Link> : eventSentence(g, { t, goalTitle, nameOf, viewerId })}
        </p>
        <p className="text-xs t-muted mt-0.5">{fmtRelative(g.at, locale)}</p>
      </li>
    );
  };
  if (groups.length === 0) return <p className="text-sm t-muted">{t("people.noActivity")}</p>;
  const rest = groups.slice(visible, 15);
  return (
    <div>
      <ol className="relative flex flex-col gap-4 before:absolute before:left-4 before:top-3 before:bottom-3 before:w-px before:bg-line">{groups.slice(0, visible).map(item)}</ol>
      {rest.length > 0 && (
        <details className="group mt-4">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold text-blue-deep hover:underline inline-flex items-center gap-1">{t("pd.allActivity")} <ArrowRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden /></summary>
          <ol className="relative flex flex-col gap-4 mt-4 before:absolute before:left-4 before:top-3 before:bottom-3 before:w-px before:bg-line">{rest.map(item)}</ol>
        </details>
      )}
    </div>
  );
}

/* ─────────────────────────────── Eerstvolgende stap ─────────────────────────────── */

export interface NextAction { key: string; icon: IconName; tone: Tone; verb: string; detail?: string; minutes: number; href: string }

export function NextActions({ actions, t }: { actions: NextAction[]; t: T }) {
  return (
    <ul className="flex flex-col divide-y divide-mint/30">
      {actions.map((a) => (
        <li key={a.key}>
          <Link href={a.href} className="press group flex items-center gap-3 py-3 first:pt-0 -mx-2 px-2 rounded-2xl hover:bg-white/70">
            <ClayIcon name={a.icon} tone={a.tone} size="sm" className="bg-white" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-sm leading-snug">{a.verb}</span>
              <span className="flex items-center gap-1.5 text-xs t-muted mt-0.5 min-w-0">
                <span className="inline-flex items-center gap-1 font-semibold text-mint-deep whitespace-nowrap shrink-0"><Clock className="size-3" aria-hidden /> {t("pd.minutes", { n: a.minutes })}</span>
                {a.detail && <span className="truncate">· {a.detail}</span>}
              </span>
            </span>
            <ArrowRight className="size-4 text-ink-3 group-hover:text-ink transition-colors" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────── KPI-rijen ─────────────────────────────── */

export function KpiRows({ views, t, canCheckin }: { views: KpiView[]; t: T; canCheckin: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {views.map((v) => {
        const tone = v.status === "achieved" ? "mint" : v.status === "behind" ? "coral" : v.status === "needs_attention" ? "yellow" : "blue";
        const open = canCheckin && !v.openPeriod.done;
        return (
          <li key={v.kpi.id} className="py-3.5 first:pt-0 last:pb-0 grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-center">
            <ClayIcon name="kpi" tone={tone as Tone} size="sm" />
            <div className="min-w-0">
              <Link href={`/kpis/${v.kpi.id}`} className="font-semibold text-sm hover:text-blue-deep">{v.kpi.name}</Link>
              <p className="text-xs t-muted">{t("kpis.targetPer", { v: fmtValue(v.kpi.target_value, v.kpi.unit), p: periodWord(t, v.kpi.frequency) })}</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 min-w-0">
              <span className="font-display font-extrabold tnum w-16 text-right shrink-0">{fmtValue(v.value, v.kpi.unit)}</span>
              <div className="flex-1 min-w-0"><RatioBar ratio={v.ratio} tone={tone as "blue"} /></div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <StatusPill status={v.status} size="xs" />
              {open && <Link href="/checkin" className="press text-xs font-semibold rounded-full px-3 py-1.5 bg-mint text-ink hover:brightness-95">{t("pd.checkin")}</Link>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
