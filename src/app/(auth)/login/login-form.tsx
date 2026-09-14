"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { useT } from "@/lib/i18n/client";

export function LoginForm({ next }: { next: string }) {
  const [state, action, isPending] = useActionState<AuthState, FormData>(signIn, undefined);
  const t = useT();
  return (
    <ActionForm action={action} pending={isPending} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t("auth.email")} htmlFor="email" required><input id="email" name="email" type="email" autoComplete="email" required className="ctl" placeholder="jij@bedrijf.nl" /></Field>
      <Field label={t("auth.password")} htmlFor="password" required><input id="password" name="password" type="password" autoComplete="current-password" required className="ctl" /></Field>
      <FormMessage error={state?.error} />
      <SubmitButton size="lg" pendingText={t("auth.loggingIn")} className="mt-1">{t("auth.login")}</SubmitButton>
    </ActionForm>
  );
}
