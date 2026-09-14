import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, previousPeriod, FREQUENCY_LABELS } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { KpiCard } from "@/components/kpis/kpi-card";
import { ButtonLink, EmptyState, Chip } from "@/components/ui";
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
  const base = `period=${period.key}${period.key === "custom" ? `&from=${one("from")}&to=${one("to")}` : ""}`;
  const onTarget = views.filter((v) => v.status === "achieved").length;

  return (
    <div className="pt-2">
      <PageHeader icon="kpi" tone="blue" eyebrow="KPI's" title="Hoe de KPI's lopen" description={views.length ? `${onTarget} van ${views.length} KPI's staan op target in deze periode.` : "Wijs KPI's toe aan personen, teams of het hele bedrijf."} actions={<ButtonLink href="/kpis/new" size="sm"><Plus className="size-4" aria-hidden /> Nieuwe KPI</ButtonLink>}>
        <div className="flex flex-col gap-4">
          <PeriodBar current={period.key} label={period.label} />
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_ORDER.map((s) => (
              <Link key={s} href={`/kpis?${base}${fStatus === s ? "" : `&status=${s}`}`} className={`press rounded-full ${fStatus === s ? "ring-2 ring-ink/40" : ""}`}><Chip tone={STATUS_META[s].tone} className="!text-sm !px-3.5 !py-1.5">{STATUS_META[s].label} · {counts[s]}</Chip></Link>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-blue-deep list-none [&::-webkit-details-marker]:hidden">Meer filters (persoon, team, categorie, frequentie)</summary>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="period" value={period.key} />
              {period.key === "custom" && <><input type="hidden" name="from" value={one("from")} /><input type="hidden" name="to" value={one("to")} /></>}
              {fStatus && <input type="hidden" name="status" value={fStatus} />}
              <label className="sr-only" htmlFor="k-q">Zoeken</label><input id="k-q" name="q" defaultValue={q} placeholder="Zoeken…" className="ctl !w-40 !py-2 text-sm" />
              <label className="sr-only" htmlFor="k-person">Persoon</label><select id="k-person" name="person" defaultValue={fPerson} className="ctl !w-auto !py-2 text-sm"><option value="">Iedereen</option>{dir.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
              <label className="sr-only" htmlFor="k-team">Team</label><select id="k-team" name="team" defaultValue={fTeam} className="ctl !w-auto !py-2 text-sm"><option value="">Alle teams</option>{dir.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <label className="sr-only" htmlFor="k-cat">Categorie</label><select id="k-cat" name="category" defaultValue={fCat} className="ctl !w-auto !py-2 text-sm"><option value="">Alle categorieën</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <label className="sr-only" htmlFor="k-freq">Frequentie</label><select id="k-freq" name="frequency" defaultValue={fFreq} className="ctl !w-auto !py-2 text-sm"><option value="">Alle frequenties</option>{(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</select>
              <button type="submit" className="press text-sm font-semibold px-4 py-2 rounded-full bg-white border border-line-strong hover:bg-cloud">Toepassen</button>
              {(fStatus || fPerson || fTeam || fCat || fFreq || q) && <Link href={`/kpis?period=${period.key}`} className="text-sm t-muted hover:text-ink">Wissen</Link>}
            </form>
          </details>
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>
      {filtered.length === 0 ? (
        <EmptyState icon="kpi" title="Geen KPI's gevonden" body={kpis.length === 0 ? "Maak de eerste KPI aan en wijs hem toe." : "Pas de filters aan."} action={<ButtonLink href="/kpis/new" size="sm">Nieuwe KPI</ButtonLink>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} />)}</div>
      )}
    </div>
  );
}
