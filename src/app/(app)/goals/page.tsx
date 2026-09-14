import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { GoalCard } from "@/components/goals/goal-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { STATUS_META, STATUS_ORDER, GOAL_TYPE_LABELS } from "@/lib/status";
import type { SavedFilter, Status, GoalType } from "@/lib/types";

export const metadata = { title: "Doelen" };

export default async function GoalsPage({ searchParams }: PageProps<"/goals">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "year");
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined)) ?? "";
  const fType = one("type"); const fStatus = one("status"); const fPerson = one("person"); const fTeam = one("team"); const fCat = one("category"); const q = one("q").toLowerCase();

  const [goals, filtersRes] = await Promise.all([listGoals(supabase, org.id), supabase.from("saved_filters").select("*").eq("profile_id", profile.id).order("created_at")]);
  const ids = goals.map((g) => g.id);
  const [assignments, milestones] = await Promise.all([listAssignments(supabase, ids), listMilestones(supabase, ids)]);

  const statuses = fStatus ? fStatus.split(",") : [];
  const filtered = goals.filter((g) => {
    if (fType && g.goal_type !== fType) return false;
    if (statuses.length && !statuses.includes(g.status)) return false;
    if (fPerson && g.owner_id !== fPerson && !assignments.some((a) => a.goal_id === g.id && a.profile_id === fPerson)) return false;
    if (fTeam && g.team_id !== fTeam) return false;
    if (fCat && g.category !== fCat) return false;
    if (q && !g.title.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q)) return false;
    // periode: doel is actief binnen de periode (overlap)
    const s = new Date(g.start_date); const d = new Date(g.deadline);
    if (d < period.from || s >= period.to) return false;
    return true;
  }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.deadline.localeCompare(b.deadline));

  const categories = Array.from(new Set(goals.map((g) => g.category))).sort();
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: goals.filter((g) => g.status === s).length }), {} as Record<Status, number>);

  return (
    <>
      <PageHeader eyebrow="Doelen" title="Alle doelen die jij mag zien" description="Persoonlijke, team- en company goals. Privédoelen van anderen staan hier nooit tussen." actions={<ButtonLink href="/goals/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuw doel</ButtonLink>}>
        <div className="flex flex-col gap-3">
          <PeriodBar current={period.key} label={period.label} />
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="period" value={period.key} />
            {period.key === "custom" && <><input type="hidden" name="from" value={one("from")} /><input type="hidden" name="to" value={one("to")} /></>}
            <label className="sr-only" htmlFor="f-q">Zoeken</label>
            <input id="f-q" name="q" defaultValue={q} placeholder="Zoeken…" className="ctl !w-44 !py-1.5 text-sm" />
            <label className="sr-only" htmlFor="f-type">Goal type</label>
            <select id="f-type" name="type" defaultValue={fType} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle types</option>{(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => <option key={t} value={t}>{GOAL_TYPE_LABELS[t]}</option>)}</select>
            <label className="sr-only" htmlFor="f-status">Status</label>
            <select id="f-status" name="status" defaultValue={fStatus} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle statussen</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label} ({counts[s]})</option>)}<option value="needs_attention,behind">Aandacht nodig + achter</option></select>
            <label className="sr-only" htmlFor="f-person">Persoon</label>
            <select id="f-person" name="person" defaultValue={fPerson} className="ctl !w-auto !py-1.5 text-sm"><option value="">Iedereen</option>{dir.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
            <label className="sr-only" htmlFor="f-team">Team</label>
            <select id="f-team" name="team" defaultValue={fTeam} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle teams</option>{dir.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <label className="sr-only" htmlFor="f-cat">Categorie</label>
            <select id="f-cat" name="category" defaultValue={fCat} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle categorieën</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <button type="submit" className="text-sm font-semibold px-3 py-1.5 rounded-[var(--radius-ctl)] bg-midnight-2 border border-line-strong hover:border-ice/30">Filteren</button>
            {(fType || fStatus || fPerson || fTeam || fCat || q) && <Link href={`/goals?period=${period.key}`} className="text-xs text-muted hover:text-ice underline underline-offset-4">Wissen</Link>}
          </form>
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>
      <p className="t-sub mb-3 t-num">{filtered.length} van {goals.length} doelen</p>
      {filtered.length === 0 ? (
        <EmptyState title="Geen doelen gevonden" body={goals.length === 0 ? "Maak je eerste doel aan. Persoonlijke doelen kun je privé houden." : "Pas de filters of de periode aan."} action={<ButtonLink href="/goals/new" size="sm">Nieuw doel</ButtonLink>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} teamName={g.team_id ? dir.teamById.get(g.team_id)?.name : null} />
          ))}
        </div>
      )}
    </>
  );
}
