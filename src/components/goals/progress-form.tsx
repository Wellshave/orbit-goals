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
        <Field label="Toelichting" htmlFor="note">
          <textarea id="note" name="note" className="ctl !min-h-16" placeholder={done ? "Waarom wordt dit heropend?" : "Wat is er opgeleverd?"} />
        </Field>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton variant={done ? "secondary" : "orchid"} pendingText="Opslaan…">{done ? "Doel heropenen" : "Markeren als behaald"}</SubmitButton>
      </form>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="goal_id" value={goal.id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="well inline-flex p-0.5 gap-0.5 self-start" role="group" aria-label="Soort update">
        {(["absolute", "delta"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] ${mode === m ? "bg-midnight-3 text-ice" : "text-muted hover:text-ice"}`}>
            {m === "absolute" ? "Nieuwe stand" : "Toename / afname"}
          </button>
        ))}
      </div>
      <Field label={mode === "absolute" ? `Nieuwe waarde (${goal.unit || "aantal"})` : `Verschil (${goal.unit || "aantal"})`} htmlFor="value" required hint={`Huidige stand: ${fmtValue(goal.current_value, goal.unit)}`}>
        <input id="value" name="value" inputMode="decimal" required className="ctl t-num text-lg" placeholder={mode === "absolute" ? String(goal.current_value) : "+ of −"} autoComplete="off" />
      </Field>
      <Field label="Toelichting" htmlFor="note" hint="Wordt bewaard in de historie: wie, wanneer, wat.">
        <textarea id="note" name="note" className="ctl !min-h-16" placeholder="Wat is er gebeurd?" />
      </Field>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton pendingText="Opslaan…">Voortgang toevoegen</SubmitButton>
    </form>
  );
}
