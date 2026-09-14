import { redirect } from "next/navigation";
import { getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { TeamForm } from "@/components/people/team-form";

export const metadata = { title: "Nieuw team" };

export default async function NewTeamPage() {
  const { org, isAdmin } = await getSession();
  if (!isAdmin) redirect("/teams");
  return (
    <div className="max-w-xl pt-2">
      <PageHeader icon="team" tone="purple" eyebrow="Teams" title="Nieuw team" />
      <div className="card p-6"><TeamForm orgId={org.id} /></div>
    </div>
  );
}
