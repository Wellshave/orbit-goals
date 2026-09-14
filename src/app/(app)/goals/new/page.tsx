import { getDirectory, getSession } from "@/lib/data/session";
import { listGoals } from "@/lib/data/goals";
import { PageHeader } from "@/components/shell/page-header";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata = { title: "Nieuw doel" };

export default async function NewGoalPage() {
  const { supabase, org, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const goals = await listGoals(supabase, org.id);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Doelen" title="Nieuw doel" description={isAdmin ? "Company- en teamdoelen zijn zichtbaar voor de organisatie of het team. Persoonlijke doelen bepaal je zelf." : "Je maakt een persoonlijk doel. Kies zelf wie het mag zien."} />
      <div className="deck p-5 sm:p-6">
        <GoalForm members={dir.members} teams={dir.teams} goals={goals} me={profile} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
