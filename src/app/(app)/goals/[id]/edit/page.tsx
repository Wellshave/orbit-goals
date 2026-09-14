import { notFound, redirect } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { getGoalBundle, listGoals } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { deleteGoal } from "@/app/actions/goals";

export const metadata = { title: "Doel bewerken" };

export default async function EditGoalPage({ params }: PageProps<"/goals/[id]/edit">) {
  const { id } = await params;
  const { supabase, org, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const [bundle, goals] = await Promise.all([getGoalBundle(supabase, id), listGoals(supabase, org.id)]);
  if (!bundle) notFound();
  const g = bundle.goal;
  const canManage = g.owner_id === profile.id || g.created_by === profile.id || (isAdmin && g.visibility !== "private" && g.visibility !== "shared") || bundle.shares.some((s) => s.profile_id === profile.id && s.can_edit);
  if (!canManage) redirect(`/goals/${id}`);
  return (
    <div className="max-w-3xl pt-2">
      <PageHeader help="goal-form" icon="rocket" tone="coral" eyebrow="Doel bewerken" title={g.title} />
      <div className="card p-6 sm:p-8">
        <GoalForm goal={g} members={dir.members} teams={dir.teams} goals={goals} me={profile} isAdmin={isAdmin} assignees={bundle.assignments.map((a) => a.profile_id)} shares={bundle.shares.map((s) => s.profile_id)} />
      </div>
      <form action={deleteGoal} className="mt-6 tile soft-peach p-4 flex items-center justify-between gap-4">
        <input type="hidden" name="id" value={g.id} />
        <p className="text-sm t-muted">Verwijderen wist ook alle updates, milestones en reacties van dit doel.</p>
        <button type="submit" className="text-sm font-semibold text-coral-deep hover:underline shrink-0">Doel verwijderen</button>
      </form>
    </div>
  );
}
