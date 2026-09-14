"use client";

import { useActionState, useState } from "react";
import { addProgress } from "@/app/actions/goals";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Goal } from "@/lib/types";
import { fmtValue } from "@/lib/format";

export function ProgressForm({ goal }: { goal: Goal }) {
  const [state, action] = useActionState(addProgress, undefined);
  const [mode, setMode] = useState<"absolute" | "delta">("absolute");
  if (goal.measure === "binary") {
    const done = goal.current_value >= 1;
    return (
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="goal_id" value={goal.id} />
        <input type="hidden" name="mode" value={done ? "undo" : "done"} />
        <Field label="Toelichting" htmlFor="note"><textarea id="note" name="note" className="ctl !min-h-16" placeholder={done ? "Waarom wordt dit heropend?" : "Wat is er opgeleverd?"} /></Field>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton variant={done ? "secondary" : "mint"} size="lg" pendingText="Opslaan…">{done ? "Doel heropenen" : "Markeren als behaald"}</SubmitButton>
      </form>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="goal_id" value={goal.id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud self-start" role="group" aria-label="Soort update">
        {(["absolute", "delta"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`press px-3 py-1.5 text-sm font-semibold rounded-full ${mode === m ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{m === "absolute" ? "Nieuwe stand" : "Erbij of eraf"}</button>
        ))}
      </div>
      <Field label={mode === "absolute" ? `Nieuwe stand${goal.unit ? ` (${goal.unit})` : ""}` : `Verschil${goal.unit ? ` (${goal.unit})` : ""}`} htmlFor="value" required hint={`Nu: ${fmtValue(goal.current_value, goal.unit)}`}>
        <input id="value" name="value" inputMode="decimal" required className="ctl ctl-lg tnum" placeholder={mode === "absolute" ? String(goal.current_value) : "+ of −"} autoComplete="off" />
      </Field>
      <Field label="Wat is er gebeurd?" htmlFor="note" hint="Wordt bewaard in de historie."><textarea id="note" name="note" className="ctl !min-h-16" /></Field>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton size="lg" pendingText="Opslaan…">Voortgang opslaan</SubmitButton>
    </form>
  );
}
