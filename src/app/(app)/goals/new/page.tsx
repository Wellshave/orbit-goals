import { getDirectory, getSession } from "@/lib/data/session";
import { listGoals } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("goalDetail.newTitle") };
}

export default async function NewGoalPage() {
  const { supabase, org, profile, isAdmin, t } = await getSession();
  const dir = await getDirectory();
  const goals = await listGoals(supabase, org.id);
  return (
    <div className="max-w-3xl pt-2">
      <PageHeader help="goal-form" icon="rocket" tone="coral" eyebrow={t("goals.title")} title={t("goalDetail.newTitle")} description={isAdmin ? t("goalDetail.newSubAdmin") : t("goalDetail.newSubMember")} />
      <div className="card p-6 sm:p-8">
        <GoalForm members={dir.members} teams={dir.teams} goals={goals} me={profile} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
