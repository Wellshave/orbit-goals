"use client";

import { startTransition, useActionState, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { checkinKpi, deleteCheckin } from "@/app/actions/kpis";
import { PendingCtx } from "@/components/ui/form";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Kpi, KpiCheckin } from "@/lib/types";
import { periodLabel, toISODate } from "@/lib/periods";
import { fmtValue, fmtDate } from "@/lib/format";
import { kpiHit } from "@/lib/status";
import { useLocale, useT } from "@/lib/i18n/client";

const num = (raw: string) => { const n = Number(raw.replace(",", ".")); return Number.isFinite(n) ? n : 0; };

/**
 * Check-in voor één periode. Het veld is de totaalstand van die periode, niet een losse toevoeging:
 * je kunt hem met − en + ophogen, later bijwerken en helemaal terugdraaien. Het formulier blijft
 * na opslaan staan, zodat een week niet "verdwijnt" zodra je hem invult.
 */
export function CheckinForm({ kpi, period, existing, back, compact = false }: { kpi: Kpi; period: { start: Date; end: Date }; existing?: KpiCheckin | null; back?: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  const t = useT();
  const locale = useLocale();
  const [state, action, isPending] = useActionState(checkinKpi, undefined);
  const [removeState, removeAction, isRemoving] = useActionState(deleteCheckin, undefined);

  const saved = existing ? Number(existing.value) : null;
  const [value, setValue] = useState(saved === null ? "" : String(saved));
  // Na opslaan of terugdraaien komt de serverwaarde binnen; het veld volgt die (render-time, geen effect).
  const [seen, setSeen] = useState(saved);
  if (saved !== seen) { setSeen(saved); setValue(saved === null ? "" : String(saved)); }

  const hit = saved !== null && kpiHit(kpi, saved);
  // Functionele update: drie keer snel achter elkaar op + drukken telt ook echt als drie.
  const step = (d: number) => setValue((v) => String(Math.max(0, Math.round((num(v) + d) * 100) / 100)));
  const label = `${t(`checkin.totalBy.${kpi.frequency}`)}${kpi.unit ? ` (${kpi.unit})` : ""}`;

  return (
    <div className="flex flex-col gap-3">
      {saved !== null && (
        <motion.p
          key={saved}
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`tile ${hit ? "soft-mint" : "soft-sky"} px-3.5 py-2.5 flex items-center gap-2.5 text-sm`}
          role="status"
        >
          <span className={`clay size-7 shrink-0 ${hit ? "bg-mint text-white" : "bg-blue text-white"}`}><Check className="size-4" strokeWidth={3} /></span>
          <span className="min-w-0">
            <span className="font-semibold">{hit ? t("checkin.niceHit") : t("checkin.saved")}</span>{" "}
            <span className="t-muted">{t("checkin.counts", { v: fmtValue(saved, kpi.unit), t: fmtValue(kpi.target_value, kpi.unit) })}</span>
          </span>
        </motion.p>
      )}

      <form
        action={action}
        onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => { void action(fd); }); }}
        className="flex flex-col gap-3"
      >
        <PendingCtx.Provider value={isPending}>
          <input type="hidden" name="kpi_id" value={kpi.id} />
          <input type="hidden" name="period_start" value={toISODate(period.start)} />
          <input type="hidden" name="period_end" value={toISODate(period.end)} />
          {back && <input type="hidden" name="back" value={back} />}
          {!compact && <p className="text-sm t-muted">{t("checkin.periodLine", { p: periodLabel(kpi.frequency, period.start, locale), a: fmtDate(period.start, "d MMM", locale), b: fmtDate(period.end, "d MMM", locale), t: fmtValue(kpi.target_value, kpi.unit) })}</p>}

          <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-[1fr_auto] items-end" : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"}`}>
            <Field label={label} htmlFor={`v-${kpi.id}-${toISODate(period.start)}`} hint={!compact ? t("checkin.totalHint") : undefined}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => step(-1)} disabled={num(value) <= 0 && value.trim() !== ""} className="press grid place-items-center size-11 shrink-0 rounded-full bg-white border border-line text-ink-2 hover:text-ink disabled:opacity-40" aria-label={t("checkin.minus")}><Minus className="size-4" aria-hidden /></button>
                <input
                  id={`v-${kpi.id}-${toISODate(period.start)}`} name="value" inputMode="decimal" value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="ctl ctl-lg tnum text-center" placeholder="0" autoComplete="off" data-tour="checkin-input"
                />
                <button type="button" onClick={() => step(1)} className="press grid place-items-center size-11 shrink-0 rounded-full bg-mint text-ink hover:brightness-95" aria-label={t("checkin.plus")}><Plus className="size-4" aria-hidden /></button>
              </div>
            </Field>
            {!compact && <Field label={t("checkin.note")} htmlFor={`n-${kpi.id}-${toISODate(period.start)}`}><input id={`n-${kpi.id}-${toISODate(period.start)}`} name="note" defaultValue={existing?.note ?? ""} className="ctl" placeholder={t("checkin.notePlaceholder")} /></Field>}
            {compact && <span data-tour="checkin-save"><SubmitButton variant="mint" size="lg" pendingText="…">{saved !== null ? t("checkin.updateShort") : t("checkin.save")}</SubmitButton></span>}
          </div>

          <FormMessage error={state?.error ?? removeState?.error} />

          {!compact && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span data-tour="checkin-save"><SubmitButton variant="mint" size="lg" pendingText={t("common.saving")}>{saved !== null ? t("checkin.update") : t("checkin.save")}</SubmitButton></span>
              {saved === null && <button type="submit" name="done" value="on" className="press text-sm font-semibold text-mint-deep hover:underline">{t("checkin.targetReachedShort", { v: fmtValue(kpi.target_value, kpi.unit) })}</button>}
            </div>
          )}
        </PendingCtx.Provider>
      </form>

      {saved !== null && (
        <form action={removeAction} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => { void removeAction(fd); }); }}>
          <input type="hidden" name="kpi_id" value={kpi.id} />
          <input type="hidden" name="period_start" value={toISODate(period.start)} />
          <button type="submit" disabled={isRemoving} className="press inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-coral-deep disabled:opacity-50">
            <RotateCcw className="size-3.5" aria-hidden /> {t("checkin.undo")}
          </button>
        </form>
      )}
    </div>
  );
}
