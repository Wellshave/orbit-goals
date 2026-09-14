"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

export type AuthState = { error?: string; success?: string } | undefined;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const { t } = await getT();
  if (!email || !password) return { error: t("actions.fillEmailPassword") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) return { error: t("actions.emailNotConfirmed") };
    return { error: t("actions.badLogin") };
  }
  // Taalvoorkeur van het profiel overnemen als er nog geen keuze op dit apparaat is.
  const store = await cookies();
  if (!store.get(LOCALE_COOKIE) && data.user) {
    const { data: prof } = await supabase.from("profiles").select("locale").eq("id", data.user.id).single();
    if (prof && isLocale(prof.locale)) store.set(LOCALE_COOKIE, prof.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "");
  const { t } = await getT();
  if (!fullName) return { error: t("actions.fillName") };
  if (!email) return { error: t("actions.fillEmail") };
  if (password.length < 8) return { error: t("actions.password8") };

  const supabase = await createClient();
  const nextPath = invite ? `/invite/${invite}` : "/onboarding";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) return { error: error.message === "User already registered" ? t("actions.emailExists") : error.message };

  if (data.session) {
    redirect(nextPath);
  }
  return { success: t("actions.accountCreated") };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { t } = await getT();
  if (!email) return { error: t("actions.fillEmail") };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/settings` });
  return { success: t("actions.resetSent") };
}
