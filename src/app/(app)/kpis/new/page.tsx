import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { KpiForm } from "@/components/kpis/kpi-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("kpis.newTitle") };
}

export default async function NewKpiPage() {
  const { profile, isAdmin, t } = await getSession();
  const dir = await getDirectory();
  return (
    <div className="max-w-3xl pt-2">
      <PageHeader help="kpi-form" icon="kpi" tone="blue" eyebrow={t("kpis.title")} title={t("kpis.newTitle")} description={isAdmin ? t("kpis.newSubAdmin") : t("kpis.newSubMember")} />
      <div className="card p-6 sm:p-8"><KpiForm members={dir.members} teams={dir.teams} me={profile} isAdmin={isAdmin} /></div>
    </div>
  );
}
