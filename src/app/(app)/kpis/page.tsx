import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, previousPeriod, FREQUENCY_LABELS } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { KpiCard } from "@/components/kpis/kpi-card";
import { ButtonLink, EmptyState, Stat } from "@/components/ui";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { SavedFilter, Frequency } from "@/lib/types";

export const metadata = { title: "KPI's" };

export default async function KpisPage({ searchParams }: PageProps<"/kpis">) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, "week");
  const prev = previousPeriod(period);
  const { supabase, org, profile } = await getSession();
  const dir = await getDirectory();
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined)) ?? "";
  const fStatus = one("status"); const fPerson = one("person"); const fTeam = one("team"); const fCat = one("category"); const fFreq = one("frequency"); const q = one("q").toLowerCase();

  const [kpis, filtersRes] = await Promise.all([listKpis(supabase, org.id), supabase.from("saved_filters").select("*").eq("profile_id", profile.id).order("created_at")]);
  const ids = kpis.map((k) => k.id);
  const [assignments, checkins] = await Promise.all([listKpiAssignments(supabase, ids), listCheckins(supabase, ids, { from: new Date(prev.from.getTime() - 1000 * 3600 * 24 * 400) })]);
  const views = kpis.map((k) => buildKpiView(k, assignments, checkins, period, fPerson || undefined));
  const statuses = fStatus ? fStatus.split(",") : [];
  const filtered = views.filter((v) => {
    if (statuses.length && !statuses.includes(v.status)) return false;
    if (fPerson && !v.assignees.includes(fPerson) && v.kpi.owner_id !== fPerson) return false;
    if (fTeam && v.kpi.team_id !== fTeam) return false;
    if (fCat && v.kpi.category !== fCat) return false;
    if (fFreq && v.kpi.frequency !== fFreq) return false;
    if (q && !v.kpi.name.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const categories = Array.from(new Set(kpis.map((k) => k.category))).sort();
  const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: views.filter((v) => v.status === s).length }), {} as Record<string, number>);

  return (
    <>
      <PageHeader eyebrow="KPI-management" title="KPI's" description="Toegewezen aan personen, teams of het hele bedrijf. Filter op periode, persoon, team, categorie en status." actions={<ButtonLink href="/kpis/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuwe KPI</ButtonLink>}>
        <div className="flex flex-col gap-3">
          <PeriodBar current={period.key} label={period.label} />
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="period" value={period.key} />
            {period.key === "custom" && <><input type="hidden" name="from" value={one("from")} /><input type="hidden" name="to" value={one("to")} /></>}
            <label className="sr-only" htmlFor="k-q">Zoeken</label>
            <input id="k-q" name="q" defaultValue={q} placeholder="Zoeken…" className="ctl !w-40 !py-1.5 text-sm" />
            <label className="sr-only" htmlFor="k-status">Status</label>
            <select id="k-status" name="status" defaultValue={fStatus} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle statussen</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label} ({counts[s]})</option>)}<option value="needs_attention,behind">Aandacht nodig + achter</option></select>
            <label className="sr-only" htmlFor="k-person">Persoon</label>
            <select id="k-person" name="person" defaultValue={fPerson} className="ctl !w-auto !py-1.5 text-sm"><option value="">Iedereen</option>{dir.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
            <label className="sr-only" htmlFor="k-team">Team</label>
            <select id="k-team" name="team" defaultValue={fTeam} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle teams</option>{dir.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <label className="sr-only" htmlFor="k-cat">Categorie</label>
            <select id="k-cat" name="category" defaultValue={fCat} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle categorieën</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <label className="sr-only" htmlFor="k-freq">Frequentie</label>
            <select id="k-freq" name="frequency" defaultValue={fFreq} className="ctl !w-auto !py-1.5 text-sm"><option value="">Alle frequenties</option>{(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</select>
            <button type="submit" className="text-sm font-semibold px-3 py-1.5 rounded-[var(--radius-ctl)] bg-midnight-2 border border-line-strong hover:border-ice/30">Filteren</button>
            {(fStatus || fPerson || fTeam || fCat || fFreq || q) && <Link href={`/kpis?period=${period.key}`} className="text-xs text-muted hover:text-ice underline underline-offset-4">Wissen</Link>}
          </form>
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>

      <section className="deck p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6" aria-label="Statusverdeling">
        {STATUS_ORDER.map((s) => (
          <Stat key={s} label={STATUS_META[s].label} value={counts[s]} size="sm" tone={STATUS_META[s].tone as "cobalt" | "amber" | "coral" | "orchid" | "muted"} />
        ))}
      </section>

      {filtered.length === 0 ? (
        <EmptyState title="Geen KPI's gevonden" body={kpis.length === 0 ? "Maak de eerste KPI aan en wijs hem toe." : "Pas de filters aan."} action={<ButtonLink href="/kpis/new" size="sm">Nieuwe KPI</ButtonLink>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} teamName={v.kpi.team_id ? dir.teamById.get(v.kpi.team_id)?.name : null} />
          ))}
        </div>
      )}
    </>
  );
}
