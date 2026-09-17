"use client";

import { useActionState, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { deleteRoutineLog, logRoutine } from "@/app/actions/goals";
import { ActionForm } from "@/components/ui/form";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { RoutineStats } from "@/lib/goals/routine";
import { fmtDate, fmtValue, pct } from "@/lib/format";
import type { GoalRoutine, RoutineLog } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/client";

/** Gekoppelde routine binnen een doel: "deze week 2 van 3", loggen en de laatste sessies. */
export function RoutinePanel({ goalId, routine, stats, logs, meId, canLog }: { goalId: string; routine: GoalRoutine; stats: RoutineStats; logs: RoutineLog[]; meId: string; canLog: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, isPending] = useActionState(logRoutine, undefined);
  const [open, setOpen] = useState(false);
  const withQuantity = routine.track !== "sessions";
  const today = new Date().toISOString().slice(0, 10);
  const dots = Array.from({ length: Math.max(routine.times_per_period, stats.done) }, (_, i) => i < stats.done);
  const periodWord = t(`routine.this.${routine.period}`);

  return (
    <div data-tour="routine">
      <p className="font-display font-extrabold text-2xl leading-none">{t("routine.ofTarget", { done: stats.done, target: stats.target })}</p>
      <p className="text-sm text-ink-2 mt-1">{routine.name} · {periodWord}</p>
      <div className="flex flex-wrap gap-1.5 mt-3" aria-hidden>
        {dots.map((on, i) => <span key={i} className={`grid place-items-center size-8 rounded-full ${on ? "bg-mint text-ink" : "bg-white border-2 border-dashed border-line"}`}>{on && <Check className="size-4" />}</span>)}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {withQuantity && <><dt className="t-muted">{t("routine.quantityPeriod", { p: periodWord.toLowerCase() })}</dt><dd className="font-semibold text-right">{fmtValue(stats.quantity, routine.unit)}</dd></>}
        {withQuantity && stats.longest > 0 && <><dt className="t-muted">{t("routine.longest")}</dt><dd className="font-semibold text-right">{fmtValue(stats.longest, routine.unit)}</dd></>}
        <dt className="t-muted">{t("routine.consistency")}</dt><dd className="font-semibold text-right">{stats.consistency === null ? t("routine.consistencyNone") : pct(stats.consistency)}</dd>
        <dt className="t-muted">{t("routine.totalLogged")}</dt><dd className="font-semibold text-right">{stats.total}</dd>
      </dl>

      {canLog && (
        <div className="mt-4 bg-white/80 rounded-2xl p-4">
          <ActionForm action={action} pending={isPending} className="flex flex-col gap-3">
            <input type="hidden" name="routine_id" value={routine.id} />
            <input type="hidden" name="goal_id" value={goalId} />
            {(open || withQuantity) && (
              <div className="grid grid-cols-2 gap-3">
                {withQuantity && <Field label={routine.unit ? t("routine.quantityUnit", { u: routine.unit }) : t("routine.quantity")} htmlFor="rl-q"><input id="rl-q" name="quantity" inputMode="decimal" className="ctl tnum" placeholder="0" autoComplete="off" /></Field>}
                <Field label={t("routine.date")} htmlFor="rl-d"><input id="rl-d" name="logged_on" type="date" defaultValue={today} max={today} className="ctl" /></Field>
                {open && <Field label={t("progressForm.note")} htmlFor="rl-n" className="col-span-2"><input id="rl-n" name="note" className="ctl" maxLength={200} /></Field>}
              </div>
            )}
            <FormMessage error={state?.error} success={state?.success} />
            <div className="flex items-center gap-3">
              <SubmitButton variant="mint" size="lg" pendingText={t("common.saving")}><Check className="size-4" aria-hidden /> {t("routine.logOne", { name: routine.name })}</SubmitButton>
              {!open && <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-ink-2 hover:text-ink">{t("routine.moreFields")}</button>}
            </div>
          </ActionForm>
        </div>
      )}

      {logs.length > 0 && (
        <ol className="mt-4 divide-y divide-line text-sm">
          {logs.slice(0, 6).map((l) => (
            <li key={l.id} className="py-2 flex items-center justify-between gap-2">
              <span className="min-w-0"><span className="font-semibold">{fmtDate(l.logged_on, "EEE d MMM", locale)}</span>{l.quantity ? <span className="t-muted"> · {fmtValue(l.quantity, routine.unit)}</span> : null}{l.note ? <span className="t-muted"> · {l.note}</span> : null}</span>
              {l.profile_id === meId && <form action={deleteRoutineLog}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="goal_id" value={goalId} /><button type="submit" className="p-1.5 text-ink-3 hover:text-coral-deep" aria-label={t("routine.deleteLog")}><Trash2 className="size-3.5" /></button></form>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
