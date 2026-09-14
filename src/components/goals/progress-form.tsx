"use client";

import { useActionState, useState } from "react";
import { addProgress } from "@/app/actions/goals";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Goal } from "@/lib/types";
import { fmtValue } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

export function ProgressForm({ goal }: { goal: Goal }) {
  const [state, action] = useActionState(addProgress, undefined);
  const [mode, setMode] = useState<"absolute" | "delta">("absolute");
  const t = useT();
  if (goal.measure === "binary") {
    const done = goal.current_value >= 1;
    return (
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="goal_id" value={goal.id} />
        <input type="hidden" name="mode" value={done ? "undo" : "done"} />
        <Field label={t("progressForm.note")} htmlFor="note"><textarea id="note" name="note" className="ctl !min-h-16" placeholder={done ? t("progressForm.reopenWhy") : t("progressForm.delivered")} /></Field>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton variant={done ? "secondary" : "mint"} size="lg" pendingText={t("common.saving")}>{done ? t("progressForm.reopen") : t("progressForm.markDone")}</SubmitButton>
      </form>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3" data-tour="progress-form">
      <input type="hidden" name="goal_id" value={goal.id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud self-start" role="group" aria-label={t("progressForm.kind")}>
        {(["absolute", "delta"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`press px-3 py-1.5 text-sm font-semibold rounded-full ${mode === m ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{m === "absolute" ? t("progressForm.newValue") : t("progressForm.delta")}</button>
        ))}
      </div>
      <Field label={mode === "absolute" ? (goal.unit ? t("progressForm.newValueUnit", { u: goal.unit }) : t("progressForm.newValue")) : (goal.unit ? t("progressForm.deltaUnit", { u: goal.unit }) : t("progressForm.delta"))} htmlFor="value" required hint={t("progressForm.now", { v: fmtValue(goal.current_value, goal.unit) })}>
        <input id="value" name="value" inputMode="decimal" required className="ctl ctl-lg tnum" placeholder={mode === "absolute" ? String(goal.current_value) : t("progressForm.plusMinus")} autoComplete="off" />
      </Field>
      <Field label={t("progressForm.what")} htmlFor="note" hint={t("progressForm.history")}><textarea id="note" name="note" className="ctl !min-h-16" /></Field>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton size="lg" pendingText={t("common.saving")}>{t("progressForm.save")}</SubmitButton>
    </form>
  );
}
