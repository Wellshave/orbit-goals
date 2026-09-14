"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/org";
import { FormMessage, SubmitButton } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  const t = useT();
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage error={state?.error} />
      <SubmitButton size="lg" pendingText={t("common.busy")}>{t("auth.acceptInvite")}</SubmitButton>
    </form>
  );
}
