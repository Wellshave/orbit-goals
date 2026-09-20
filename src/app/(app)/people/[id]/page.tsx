import { getSession } from "@/lib/data/session";
import { PersonDashboard } from "@/components/people/person-dashboard";

export async function generateMetadata({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const { supabase, profile, t } = await getSession();
  if (id === profile.id) return { title: t("people.myDashboard") };
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return { title: data?.full_name ? data.full_name : { absolute: "Orbit" } };
}

export default async function PersonPage({ params, searchParams }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  return <PersonDashboard personId={id} sp={sp} />;
}
