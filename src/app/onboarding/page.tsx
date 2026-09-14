import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_NAME } from "@/lib/product";
import { OrbitMark } from "@/components/orbit/orbit-mark";
import { OrgStep, ProfileStep } from "./steps";
import { getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { LanguageToggle } from "@/components/shell/language-toggle";
import type { Profile, Team } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("onboarding.title") };
}

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const { t, locale } = await getT();
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
  const [{ data: teams }, { data: memberships }] = profile.org_id
    ? await Promise.all([supabase.from("teams").select("*").eq("org_id", profile.org_id).order("name"), supabase.from("team_memberships").select("team_id").eq("profile_id", user.id)])
    : [{ data: [] }, { data: [] }];

  return (
    <I18nProvider locale={locale}>
      <main className="min-h-dvh flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4"><LanguageToggle compact /></div>
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2.5 mb-8"><OrbitMark className="size-7" /><span className="font-display font-extrabold text-lg">{PRODUCT_NAME}</span></div>
          <ol className="flex items-center gap-3 text-sm font-semibold t-muted mb-6">
            <li className={step === "org" ? "text-ink bg-white rounded-full px-3 py-1 shadow-[var(--shadow-press)]" : "px-3"}>{t("onboarding.step1")}</li>
            <li aria-hidden>→</li>
            <li className={step === "profile" ? "text-ink bg-white rounded-full px-3 py-1 shadow-[var(--shadow-press)]" : "px-3"}>{t("onboarding.step2")}</li>
          </ol>
          {step === "org" ? <OrgStep /> : <ProfileStep profile={profile} orgName={org?.name ?? ""} teams={(teams ?? []) as Team[]} teamIds={((memberships ?? []) as { team_id: string }[]).map((m) => m.team_id)} />}
        </div>
      </main>
    </I18nProvider>
  );
}
