import { notFound, redirect } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { listKpiAssignments } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { KpiForm } from "@/components/kpis/kpi-form";
import { deleteKpi } from "@/app/actions/kpis";
import { getT } from "@/lib/i18n/server";
import type { Kpi } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("kpis.editTitle") };
}

export default async function EditKpiPage({ params }: PageProps<"/kpis/[id]/edit">) {
  const { id } = await params;
  const { supabase, profile, isAdmin, t } = await getSession();
  const dir = await getDirectory();
  const { data } = await supabase.from("kpis").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const kpi = data as Kpi;
  if (!(isAdmin || kpi.owner_id === profile.id || kpi.created_by === profile.id)) redirect(`/kpis/${id}`);
  const assignments = await listKpiAssignments(supabase, [id]);
  return (
    <div className="max-w-3xl pt-2">
      <PageHeader help="kpi-form" icon="kpi" tone="blue" eyebrow={t("kpis.editTitle")} title={kpi.name} />
      <div className="card p-6 sm:p-8"><KpiForm kpi={kpi} members={dir.members} teams={dir.teams} me={profile} isAdmin={isAdmin} assignees={assignments.map((a) => a.profile_id)} /></div>
      <form action={deleteKpi} className="mt-6 tile soft-peach p-4 flex items-center justify-between gap-4">
        <input type="hidden" name="id" value={kpi.id} />
        <p className="text-sm t-muted">{t("kpis.deleteWarn")}</p>
        <button type="submit" className="text-sm font-semibold text-coral-deep hover:underline shrink-0">{t("kpis.deleteKpi")}</button>
      </form>
    </div>
  );
}
