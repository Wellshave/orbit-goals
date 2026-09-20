import { getSession } from "@/lib/data/session";
import { PersonDashboard } from "@/components/people/person-dashboard";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("people.myDashboard") };
}

/** Vaste URL naar je eigen dashboard, zodat het menu-item altijd klopt. */
export default async function MyDashboardPage({ searchParams }: PageProps<"/me">) {
  const sp = await searchParams;
  const { profile } = await getSession();
  return <PersonDashboard personId={profile.id} sp={sp} />;
}
