"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";

export function SignupForm({ invite, email }: { invite: string; email: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="invite" value={invite} />
      <Field label="Volledige naam" htmlFor="full_name" required>
        <input id="full_name" name="full_name" autoComplete="name" required className="ctl" placeholder="Voornaam Achternaam" />
      </Field>
      <Field label="E-mailadres" htmlFor="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} className="ctl" placeholder="jij@bedrijf.nl" />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" hint="Minimaal 8 tekens." required>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="ctl" />
      </Field>
      <FormMessage error={state?.error} success={state?.success} />
      {!state?.success && (
        <SubmitButton size="lg" pendingText="Account wordt aangemaakt…" className="mt-1">
          Account aanmaken
        </SubmitButton>
      )}
    </form>
  );
}
