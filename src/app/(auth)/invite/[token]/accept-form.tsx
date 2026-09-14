"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/org";
import { FormMessage, SubmitButton } from "@/components/ui";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage error={state?.error} />
      <SubmitButton size="lg" pendingText="Bezig…">Uitnodiging accepteren</SubmitButton>
    </form>
  );
}
