import { redirect } from "next/navigation";
import { getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { TeamForm } from "@/components/people/team-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("teams.newTitle") };
}

export default async function NewTeamPage() {
  const { org, isAdmin, t } = await getSession();
  if (!isAdmin) redirect("/teams");
  return (
    <div className="max-w-xl pt-2">
      <PageHeader help="teams" icon="team" tone="purple" eyebrow={t("teams.title")} title={t("teams.newTitle")} />
      <div className="card p-6"><TeamForm orgId={org.id} /></div>
    </div>
  );
}
