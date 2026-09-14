import Link from "next/link";
import { Plus } from "lucide-react";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod, previousPeriod, FREQUENCIES } from "@/lib/periods";
import { buildKpiView, listCheckins, listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { PeriodBar } from "@/components/shell/period-bar";
import { SavedViews } from "@/components/filters/saved-views";
import { KpiCard } from "@/components/kpis/kpi-card";
import { ButtonLink, EmptyState, Chip } from "@/components/ui";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { getT } from "@/lib/i18n/server";
import type { SavedFilter } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("kpis.title") };
}

export default async function KpisPage({ searchParams }: PageProps<"/kpis">) {
  const sp = await searchParams;
  const { supabase, org, profile, locale, t } = await getSession();
  const period = resolvePeriod(sp, "week", locale);
  const prev = previousPeriod(period);
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
      <PageHeader help="kpis" icon="kpi" tone="blue" eyebrow={t("kpis.title")} title={t("kpis.heading")} description={views.length ? t("kpis.subCount", { a: onTarget, b: views.length }) : t("kpis.subEmpty")} actions={<ButtonLink href="/kpis/new" size="sm"><Plus className="size-4" aria-hidden /> {t("kpis.newKpi")}</ButtonLink>}>
        <div className="flex flex-col gap-4">
          <PeriodBar current={period.key} label={period.label} />
          <div className="flex flex-wrap items-center gap-2" data-tour="status-filter">
            {STATUS_ORDER.map((s) => (
              <Link key={s} href={`/kpis?${base}${fStatus === s ? "" : `&status=${s}`}`} className={`press rounded-full ${fStatus === s ? "ring-2 ring-ink/40" : ""}`}><Chip tone={STATUS_META[s].tone} className="!text-sm !px-3.5 !py-1.5">{t(`status.${s}`)} · {counts[s]}</Chip></Link>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-blue-deep list-none [&::-webkit-details-marker]:hidden">{t("kpis.moreFilters")}</summary>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="period" value={period.key} />
              {period.key === "custom" && <><input type="hidden" name="from" value={one("from")} /><input type="hidden" name="to" value={one("to")} /></>}
              {fStatus && <input type="hidden" name="status" value={fStatus} />}
              <label className="sr-only" htmlFor="k-q">{t("common.search")}</label><input id="k-q" name="q" defaultValue={q} placeholder={t("common.search")} className="ctl !w-40 !py-2 text-sm" />
              <label className="sr-only" htmlFor="k-person">{t("common.person")}</label><select id="k-person" name="person" defaultValue={fPerson} className="ctl !w-auto !py-2 text-sm"><option value="">{t("common.everyone")}</option>{dir.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
              <label className="sr-only" htmlFor="k-team">{t("common.team")}</label><select id="k-team" name="team" defaultValue={fTeam} className="ctl !w-auto !py-2 text-sm"><option value="">{t("common.allTeams")}</option>{dir.teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}</select>
              <label className="sr-only" htmlFor="k-cat">{t("common.category")}</label><select id="k-cat" name="category" defaultValue={fCat} className="ctl !w-auto !py-2 text-sm"><option value="">{t("common.allCategories")}</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <label className="sr-only" htmlFor="k-freq">{t("common.frequency")}</label><select id="k-freq" name="frequency" defaultValue={fFreq} className="ctl !w-auto !py-2 text-sm"><option value="">{t("common.allFrequencies")}</option>{FREQUENCIES.map((f) => <option key={f} value={f}>{t(`freq.${f}`)}</option>)}</select>
              <button type="submit" className="press text-sm font-semibold px-4 py-2 rounded-full bg-white border border-line-strong hover:bg-cloud">{t("common.apply")}</button>
              {(fStatus || fPerson || fTeam || fCat || fFreq || q) && <Link href={`/kpis?period=${period.key}`} className="text-sm t-muted hover:text-ink">{t("common.clear")}</Link>}
            </form>
          </details>
          <SavedViews filters={(filtersRes.data ?? []) as SavedFilter[]} />
        </div>
      </PageHeader>
      {filtered.length === 0 ? (
        <EmptyState icon="kpi" title={t("kpis.none")} body={kpis.length === 0 ? t("kpis.noneFirst") : t("kpis.noneFilter")} action={<ButtonLink href="/kpis/new" size="sm">{t("kpis.newKpi")}</ButtonLink>} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((v) => <KpiCard key={v.kpi.id} view={v} people={v.assignees.map((id) => dir.byId.get(id)!).filter(Boolean)} />)}</div>
      )}
    </div>
  );
}
