import { notFound, redirect } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { listKpiAssignments } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { KpiForm } from "@/components/kpis/kpi-form";
import { deleteKpi } from "@/app/actions/kpis";
import type { Kpi } from "@/lib/types";

export const metadata = { title: "KPI bewerken" };

export default async function EditKpiPage({ params }: PageProps<"/kpis/[id]/edit">) {
  const { id } = await params;
  const { supabase, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const { data } = await supabase.from("kpis").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const kpi = data as Kpi;
  if (!(isAdmin || kpi.owner_id === profile.id || kpi.created_by === profile.id)) redirect(`/kpis/${id}`);
  const assignments = await listKpiAssignments(supabase, [id]);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="KPI bewerken" title={kpi.name} />
      <div className="deck p-5 sm:p-6"><KpiForm kpi={kpi} members={dir.members} teams={dir.teams} me={profile} isAdmin={isAdmin} assignees={assignments.map((a) => a.profile_id)} /></div>
      <form action={deleteKpi} className="mt-6 deck p-4 flex items-center justify-between gap-4">
        <input type="hidden" name="id" value={kpi.id} />
        <p className="text-sm text-muted">Verwijderen wist ook de check-inhistorie.</p>
        <button type="submit" className="text-sm font-semibold text-coral-soft hover:underline shrink-0">KPI verwijderen</button>
      </form>
    </div>
  );
}
