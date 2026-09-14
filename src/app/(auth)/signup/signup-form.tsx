"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function SignupForm({ invite, email }: { invite: string; email: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, undefined);
  const t = useT();
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="invite" value={invite} />
      <Field label={t("auth.fullName")} htmlFor="full_name" required><input id="full_name" name="full_name" autoComplete="name" required className="ctl" placeholder={t("auth.namePlaceholder")} /></Field>
      <Field label={t("auth.email")} htmlFor="email" required><input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} className="ctl" placeholder="jij@bedrijf.nl" /></Field>
      <Field label={t("auth.password")} htmlFor="password" hint={t("auth.passwordHint")} required><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="ctl" /></Field>
      <FormMessage error={state?.error} success={state?.success} />
      {!state?.success && <SubmitButton size="lg" pendingText={t("auth.creating")} className="mt-1">{t("auth.createAccount")}</SubmitButton>}
    </form>
  );
}
