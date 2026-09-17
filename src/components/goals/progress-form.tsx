"use client";

import { useActionState, useState } from "react";
import { Check, Plus, Undo2 } from "lucide-react";
import { addProgress } from "@/app/actions/goals";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import type { Goal, Milestone } from "@/lib/types";
import { TIME_UNIT, fmtValue } from "@/lib/format";
import { goalTrack } from "@/lib/goals/formats";
import { useT } from "@/lib/i18n/client";

/** Voortgang toevoegen in de taal van de doelvorm: afvinken, een stap afronden, "vandaag gedaan", een tijd of een stand. */
export function ProgressForm({ goal, milestones = [] }: { goal: Goal; milestones?: Milestone[] }) {
  const [state, action, isPending] = useActionState(addProgress, undefined);
  const [mode, setMode] = useState<"absolute" | "delta">("absolute");
  const t = useT();
  const track = goalTrack(goal);
  const hidden = <input type="hidden" name="goal_id" value={goal.id} />;

  if (goal.measure === "binary") {
    const done = goal.current_value >= 1;
    return (
      <ActionForm action={action} pending={isPending} className="flex flex-col gap-3">
        {hidden}
        <input type="hidden" name="mode" value={done ? "undo" : "done"} />
        <Field label={t("progressForm.note")} htmlFor="note"><textarea id="note" name="note" className="ctl !min-h-16" placeholder={done ? t("progressForm.reopenWhy") : t("progressForm.delivered")} /></Field>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton variant={done ? "secondary" : "mint"} size="lg" pendingText={t("common.saving")}>{done ? t("progressForm.reopen") : t("progressForm.markDone")}</SubmitButton>
      </ActionForm>
    );
  }

  if (track === "steps") {
    const steps = [...milestones].sort((a, b) => a.target_value - b.target_value);
    const doneCount = Math.round(goal.current_value);
    return (
      <div className="flex flex-col gap-3" data-tour="progress-form">
        <ol className="flex flex-col gap-1.5">
          {steps.map((m, i) => {
            const done = i < doneCount; const isNext = i === doneCount;
            return (
              <li key={m.id} className={`flex items-center gap-3 rounded-2xl p-2.5 ${isNext ? "bg-white shadow-[var(--shadow-press)]" : ""}`}>
                <span className={`grid place-items-center size-7 rounded-full text-xs font-bold tnum shrink-0 ${done ? "bg-mint text-ink" : "bg-cloud text-ink-2"}`}>{done ? <Check className="size-4" aria-hidden /> : i + 1}</span>
                <span className={`min-w-0 flex-1 text-sm ${done ? "line-through t-muted" : "font-semibold"}`}>{m.name}</span>
                {isNext && (
                  <ActionForm action={action} pending={isPending}>{hidden}<input type="hidden" name="mode" value="absolute" /><input type="hidden" name="value" value={i + 1} /><input type="hidden" name="note" value={t("progressForm.stepNote", { s: m.name })} /><SubmitButton variant="mint" size="sm" pendingText="…">{t("progressForm.completeStep")}</SubmitButton></ActionForm>
                )}
              </li>
            );
          })}
        </ol>
        {steps.length === 0 && <p className="text-sm t-muted">{t("progressForm.noSteps")}</p>}
        {doneCount > 0 && (
          <ActionForm action={action} pending={isPending}>{hidden}<input type="hidden" name="mode" value="absolute" /><input type="hidden" name="value" value={doneCount - 1} /><input type="hidden" name="note" value={t("progressForm.undoNote")} /><button type="submit" className="text-xs font-semibold text-ink-2 hover:text-ink inline-flex items-center gap-1"><Undo2 className="size-3.5" aria-hidden /> {t("progressForm.undoStep")}</button></ActionForm>
        )}
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    );
  }

  if (track === "count") {
    return (
      <div className="flex flex-col gap-3" data-tour="progress-form">
        <ActionForm action={action} pending={isPending} className="flex flex-col gap-3">
          {hidden}<input type="hidden" name="mode" value="delta" /><input type="hidden" name="value" value="1" />
          <Field label={t("progressForm.note")} htmlFor="note" hint={goal.details?.habit?.rule ? t("progressForm.countsWhen", { r: goal.details.habit.rule }) : undefined}><input id="note" name="note" className="ctl" maxLength={200} placeholder={t("progressForm.habitNote")} /></Field>
          <SubmitButton variant="mint" size="lg" pendingText={t("common.saving")}><Plus className="size-4" aria-hidden /> {t("progressForm.doneToday")}</SubmitButton>
        </ActionForm>
        {goal.current_value > 0 && (
          <ActionForm action={action} pending={isPending}>{hidden}<input type="hidden" name="mode" value="delta" /><input type="hidden" name="value" value="-1" /><input type="hidden" name="note" value={t("progressForm.undoNote")} /><button type="submit" className="text-xs font-semibold text-ink-2 hover:text-ink inline-flex items-center gap-1"><Undo2 className="size-3.5" aria-hidden /> {t("progressForm.undoOne")}</button></ActionForm>
        )}
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    );
  }

  if (goal.unit === TIME_UNIT) {
    return (
      <ActionForm action={action} pending={isPending} className="flex flex-col gap-3" data-tour="progress-form">
        {hidden}<input type="hidden" name="mode" value="absolute" />
        <fieldset>
          <legend className="text-sm font-semibold mb-1.5">{t("progressForm.newTime")}</legend>
          <div className="flex items-end gap-2">
            {(["h", "m", "s"] as const).map((k, i) => (
              <span key={k} className="flex items-end gap-2">{i > 0 && <span className="pb-3 font-bold">:</span>}<span className="flex flex-col gap-1"><label htmlFor={`pf-${k}`} className="text-xs font-semibold t-muted">{t(k === "h" ? "wizard.hours" : k === "m" ? "wizard.minutes" : "wizard.seconds")}</label><input id={`pf-${k}`} name={`t_${k}`} inputMode="numeric" className="ctl tnum w-20 text-center" placeholder="0" autoComplete="off" /></span></span>
            ))}
          </div>
          <p className="text-xs t-muted mt-1.5">{t("progressForm.now", { v: fmtValue(goal.current_value, goal.unit) })}</p>
        </fieldset>
        <Field label={t("progressForm.what")} htmlFor="note" hint={t("progressForm.history")}><textarea id="note" name="note" className="ctl !min-h-16" /></Field>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton size="lg" pendingText={t("common.saving")}>{t("progressForm.save")}</SubmitButton>
      </ActionForm>
    );
  }

  const quantityLabel = goal.format === "achievement" ? goal.details?.quantity_label : undefined;
  const absLabel = quantityLabel ? t("progressForm.bestSoFar", { l: quantityLabel.toLowerCase(), u: goal.unit }) : goal.unit ? t("progressForm.newValueUnit", { u: goal.unit }) : t("progressForm.newValue");
  return (
    <ActionForm action={action} pending={isPending} className="flex flex-col gap-3" data-tour="progress-form">
      {hidden}
      <input type="hidden" name="mode" value={mode} />
      {!quantityLabel && (
        <div className="inline-flex p-1 gap-1 rounded-full bg-cloud self-start" role="group" aria-label={t("progressForm.kind")}>
          {(["absolute", "delta"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`press px-3 py-1.5 text-sm font-semibold rounded-full ${mode === m ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{m === "absolute" ? t("progressForm.newValue") : t("progressForm.delta")}</button>
          ))}
        </div>
      )}
      <Field label={mode === "absolute" || quantityLabel ? absLabel : goal.unit ? t("progressForm.deltaUnit", { u: goal.unit }) : t("progressForm.delta")} htmlFor="value" required hint={t("progressForm.now", { v: fmtValue(goal.current_value, goal.unit) })}>
        <input id="value" name="value" inputMode="decimal" required className="ctl ctl-lg tnum" placeholder={mode === "absolute" ? String(goal.current_value) : t("progressForm.plusMinus")} autoComplete="off" />
      </Field>
      <Field label={t("progressForm.what")} htmlFor="note" hint={t("progressForm.history")}><textarea id="note" name="note" className="ctl !min-h-16" /></Field>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton size="lg" pendingText={t("common.saving")}>{t("progressForm.save")}</SubmitButton>
    </ActionForm>
  );
}
