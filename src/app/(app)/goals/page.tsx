import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { listAssignments, listGoals, listMilestones } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { GoalCard } from "@/components/goals/goal-card";
import { ButtonLink, EmptyState, Chip } from "@/components/ui";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { SavedFilter, Status } from "@/lib/types";

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
    const s = new Date(g.start_date); const d = new Date(g.deadline);
    if (d < period.from || s >= period.to) return false;
    return true;
  }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.deadline.localeCompare(b.deadline));
  const categories = Array.from(new Set(goals.map((g) => g.category))).sort();
  const peopleOf = (goalId: string) => assignments.filter((a) => a.goal_id === goalId).map((a) => dir.byId.get(a.profile_id)!).filter(Boolean);
  const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: goals.filter((g) => g.status === s).length }), {} as Record<Status, number>);
  const base = `period=${period.key}${period.key === "custom" ? `&from=${one("from")}&to=${one("to")}` : ""}`;
  const typeHref = (t: string) => `/goals?${base}${t ? `&type=${t}` : ""}${fStatus ? `&status=${fStatus}` : ""}`;

  return (
    <div className="pt-2">
      <PageHeader help="goals" icon="rocket" tone="coral" eyebrow="Doelen" title="Alle doelen" description="Persoonlijke, team- en bedrijfsdoelen die jij mag zien. Privédoelen van anderen staan hier nooit tussen." actions={<ButtonLink href="/goals/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuw doel</ButtonLink>}>
        <div className="flex flex-col gap-4">
          <PeriodBar current={period.key} label={period.label} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex flex-wrap items-center gap-2" data-tour="type-filter">{[["", "Alles"], ["personal", "Persoonlijk"], ["team", "Team"], ["company", "Bedrijf"]].map(([v, l]) => (
              <Link key={v} href={typeHref(v)} className={`press rounded-full px-4 py-2 text-sm font-semibold ${fType === v ? "bg-ink text-white" : "bg-white border border-line text-ink-2 hover:text-ink"}`}>{l}</Link>
            ))}</span>
            <span className="w-px h-6 bg-line mx-1" aria-hidden />
            <span className="inline-flex flex-wrap items-center gap-2" data-tour="status-filter">{STATUS_ORDER.map((s) => (
              <Link key={s} href={`/goals?${base}${fType ? `&type=${fType}` : ""}${fStatus === s ? "" : `&status=${s}`}`} className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${fStatus === s ? "ring-2 ring-ink/40" : ""}`}>
                <Chip tone={STATUS_META[s].tone}>{STATUS_META[s].label} · {counts[s]}</Chip>
              </Link>
            ))}</span>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-blue-deep list-none [&::-webkit-details-marker]:hidden">Meer filters (persoon, team, categorie, zoeken)</summary>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="period" value={period.key} />
              {period.key === "custom" && <><input type="hidden" name="from" value={one("from")} /><input type="hidden" name="to" value={one("to")} /></>}
              {fType && <input type="hidden" name="type" value={fType} />}
              {fStatus && <input type="hidden" name="status" value={fStatus} />}
              <label className="sr-only" htmlFor="f-q">Zoeken</label>
              <input id="f-q" name="q" defaultValue={q} placeholder="Zoeken…" className="ctl !w-44 !py-2 text-sm" />
              <label className="sr-only" htmlFor="f-person">Persoon</label>
              <select id="f-person" name="person" defaultValue={fPerson} className="ctl !w-auto !py-2 text-sm"><option value="">Iedereen</option>{dir.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
              <label className="sr-only" htmlFor="f-team">Team</label>
              <select id="f-team" name="team" defaultValue={fTeam} className="ctl !w-auto !py-2 text-sm"><option value="">Alle teams</option>{dir.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <label className="sr-only" htmlFor="f-cat">Categorie</label>
              <select id="f-cat" name="category" defaultValue={fCat} className="ctl !w-auto !py-2 text-sm"><option value="">Alle categorieën</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <button type="submit" className="press text-sm font-semibold px-4 py-2 rounded-full bg-white border border-line-strong hover:bg-cloud">Toepassen</button>
              {(fPerson || fCat || fTeam || q || fType || fStatus) && <Link href={`/goals?period=${period.key}`} className="text-sm t-muted hover:text-ink">Wissen</Link>}
            </form>
          </details>
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>
      <p className="t-muted text-sm mb-4">{filtered.length} van {goals.length} doelen</p>
      {filtered.length === 0 ? (
        <EmptyState icon="rocket" tone="coral" title="Geen doelen gevonden" body={goals.length === 0 ? "Maak je eerste doel aan. Persoonlijke doelen kun je privé houden." : "Pas de filters of de periode aan."} action={<ButtonLink href="/goals/new" size="sm">Nieuw doel</ButtonLink>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((g) => <GoalCard key={g.id} goal={g} milestones={milestones.filter((m) => m.goal_id === g.id)} people={peopleOf(g.id)} team={g.team_id ? dir.teamById.get(g.team_id) : null} owner={dir.byId.get(g.owner_id)} />)}</div>
      )}
    </div>
  );
}
