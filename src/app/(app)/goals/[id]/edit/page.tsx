import { notFound, redirect } from "next/navigation";
import { getDirectory, getSession } from "@/lib/data/session";
import { getGoalBundle, listGoals } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalWizard } from "@/components/goals/goal-wizard";
import { draftFromGoal } from "@/lib/goals/draft";
import { deleteGoal } from "@/app/actions/goals";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("goalDetail.editTitle") };
}

export default async function EditGoalPage({ params }: PageProps<"/goals/[id]/edit">) {
  const { id } = await params;
  const { supabase, org, profile, isAdmin, t } = await getSession();
  const dir = await getDirectory();
  const [bundle, goals] = await Promise.all([getGoalBundle(supabase, id), listGoals(supabase, org.id)]);
  if (!bundle) notFound();
  const g = bundle.goal;
  const canManage = g.owner_id === profile.id || g.created_by === profile.id || (isAdmin && g.visibility !== "private" && g.visibility !== "shared") || bundle.shares.some((s) => s.profile_id === profile.id && s.can_edit);
  if (!canManage) redirect(`/goals/${id}`);
  return (
    <div className="pt-2">
      <PageHeader help="goal-form" icon="rocket" tone="coral" eyebrow={t("goalDetail.editTitle")} title={g.title} />
      <GoalWizard mode="edit" goalId={g.id} initial={draftFromGoal(g, { routine: bundle.routines[0] ?? null, shares: bundle.shares.map((s) => s.profile_id), assignees: bundle.assignments.map((a) => a.profile_id), milestones: bundle.milestones })} members={dir.members} teams={dir.teams} goals={goals} me={profile} isAdmin={isAdmin} myTeamIds={dir.teamsOf(profile.id).map((tm) => tm.id)} />
      <form action={deleteGoal} className="mt-6 max-w-3xl tile soft-peach p-4 flex items-center justify-between gap-4">
        <input type="hidden" name="id" value={g.id} />
        <p className="text-sm t-muted">{t("goalDetail.deleteWarn")}</p>
        <button type="submit" className="text-sm font-semibold text-coral-deep hover:underline shrink-0">{t("goalDetail.deleteGoal")}</button>
      </form>
    </div>
  );
}
