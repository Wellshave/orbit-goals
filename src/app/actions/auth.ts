"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string } | undefined;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Je e-mailadres is nog niet bevestigd. Check je inbox voor de bevestigingslink." };
    }
    return { error: "Onjuiste combinatie van e-mailadres en wachtwoord." };
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "");
  if (!fullName) return { error: "Vul je naam in." };
  if (!email) return { error: "Vul je e-mailadres in." };
  if (password.length < 8) return { error: "Kies een wachtwoord van minimaal 8 tekens." };

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
  if (error) return { error: error.message === "User already registered" ? "Er bestaat al een account met dit e-mailadres." : error.message };

  if (data.session) {
    redirect(nextPath);
  }
  return { success: "Account aangemaakt. We hebben je een bevestigingsmail gestuurd; klik op de link om in te loggen." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Vul je e-mailadres in." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/settings` });
  return { success: "Als dit e-mailadres bekend is, ontvang je een link om je wachtwoord te herstellen." };
}
