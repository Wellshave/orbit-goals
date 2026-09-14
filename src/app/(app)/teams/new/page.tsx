import { redirect } from "next/navigation";
import { getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { TeamForm } from "@/components/people/team-form";

export const metadata = { title: "Nieuw team" };

export default async function NewTeamPage() {
  const { org, isAdmin } = await getSession();
  if (!isAdmin) redirect("/teams");
  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="Teams" title="Nieuw team" />
      <div className="deck p-5"><TeamForm orgId={org.id} /></div>
    </div>
  );
}
