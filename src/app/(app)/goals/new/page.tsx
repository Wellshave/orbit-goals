import { getDirectory, getSession } from "@/lib/data/session";
import { listGoals } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalWizard } from "@/components/goals/goal-wizard";
import { emptyDraft } from "@/lib/goals/draft";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("goalDetail.newTitle") };
}

export default async function NewGoalPage() {
  const { supabase, org, profile, isAdmin, t } = await getSession();
  const dir = await getDirectory();
  const goals = isAdmin ? await listGoals(supabase, org.id) : [];
  return (
    <div className="pt-2">
      <PageHeader help="goal-form" icon="rocket" tone="coral" eyebrow={t("goals.title")} title={t("goalDetail.newTitle")} description={t("wizard.pageSub")} />
      <GoalWizard mode="create" initial={emptyDraft(profile.id)} members={dir.members} teams={dir.teams} goals={goals} me={profile} isAdmin={isAdmin} myTeamIds={dir.teamsOf(profile.id).map((tm) => tm.id)} />
    </div>
  );
}
