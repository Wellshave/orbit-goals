"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mailadres" htmlFor="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required className="ctl" placeholder="jij@bedrijf.nl" />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" required>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="ctl" />
      </Field>
      <FormMessage error={state?.error} />
      <SubmitButton size="lg" pendingText="Bezig met inloggen…" className="mt-1">
        Inloggen
      </SubmitButton>
    </form>
  );
}
