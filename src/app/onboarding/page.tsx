import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_NAME } from "@/lib/product";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { OrgStep, ProfileStep } from "./steps";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Aan de slag" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;
  if (!profile) redirect("/login");
  if (profile.org_id && profile.onboarded && sp.step !== "profile") redirect("/dashboard");

  const step = profile.org_id ? "profile" : "org";
  const { data: org } = profile.org_id ? await supabase.from("organizations").select("name").eq("id", profile.org_id).single() : { data: null };

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 mb-8">
          <OrbitMark className="size-7" />
          <span className="font-display font-bold text-lg">{PRODUCT_NAME}</span>
        </div>
        <ol className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-muted mb-6" aria-label="Stappen">
          <li className={step === "org" ? "text-ice" : ""}>1 · Organisatie</li>
          <li aria-hidden>—</li>
          <li className={step === "profile" ? "text-ice" : ""}>2 · Jouw profiel</li>
        </ol>
        {step === "org" ? <OrgStep /> : <ProfileStep profile={profile} orgName={org?.name ?? ""} />}
      </div>
    </main>
  );
}
