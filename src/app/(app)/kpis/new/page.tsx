import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { KpiForm } from "@/components/kpis/kpi-form";

export const metadata = { title: "Nieuwe KPI" };

export default async function NewKpiPage() {
  const { profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  return (
    <div className="max-w-3xl pt-2">
      <PageHeader help="kpi-form" icon="kpi" tone="blue" eyebrow="KPI's" title="Nieuwe KPI" description={isAdmin ? "Wijs een KPI toe aan een persoon, een team of het hele bedrijf." : "Je maakt een persoonlijke KPI voor jezelf."} />
      <div className="card p-6 sm:p-8"><KpiForm members={dir.members} teams={dir.teams} me={profile} isAdmin={isAdmin} /></div>
    </div>
  );
}
