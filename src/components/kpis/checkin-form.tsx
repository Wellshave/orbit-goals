"use client";

import { useActionState } from "react";
import { checkinKpi } from "@/app/actions/kpis";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Kpi, KpiCheckin } from "@/lib/types";
import { periodLabel, toISODate } from "@/lib/periods";
import { fmtValue, fmtDate } from "@/lib/format";

export function CheckinForm({ kpi, period, existing, back, compact = false }: { kpi: Kpi; period: { start: Date; end: Date }; existing?: KpiCheckin | null; back?: string; compact?: boolean }) {
  const [state, action] = useActionState(checkinKpi, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="kpi_id" value={kpi.id} />
      <input type="hidden" name="period_start" value={toISODate(period.start)} />
      <input type="hidden" name="period_end" value={toISODate(period.end)} />
      {back && <input type="hidden" name="back" value={back} />}
      {!compact && (
        <p className="text-sm text-ice-dim">
          Periode <strong className="text-ice">{periodLabel(kpi.frequency, period.start)}</strong> · {fmtDate(period.start, "d MMM")} – {fmtDate(period.end, "d MMM")} · target {fmtValue(kpi.target_value, kpi.unit)}
        </p>
      )}
      <div className={`grid gap-3 ${compact ? "grid-cols-[1fr_auto]" : "sm:grid-cols-[180px_1fr]"}`}>
        <Field label={`Waarde (${kpi.unit || "aantal"})`} htmlFor={`v-${kpi.id}`} required>
          <input id={`v-${kpi.id}`} name="value" inputMode="decimal" defaultValue={existing?.value ?? ""} className="ctl t-num text-lg" placeholder={String(kpi.target_value)} autoComplete="off" />
        </Field>
        {!compact && (
          <Field label="Toelichting" htmlFor={`n-${kpi.id}`}>
            <input id={`n-${kpi.id}`} name="note" defaultValue={existing?.note ?? ""} className="ctl" placeholder="Context bij dit getal (optioneel)" />
          </Field>
        )}
        {compact && (
          <div className="flex items-end">
            <SubmitButton size="md" pendingText="…">{existing ? "Bijwerken" : "Aftikken"}</SubmitButton>
          </div>
        )}
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Opslaan…">{existing ? "Check-in bijwerken" : "Check-in opslaan"}</SubmitButton>
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="done" className="accent-[#496CFF]" /> Leeg = target gehaald ({fmtValue(kpi.target_value, kpi.unit)})
          </label>
        </div>
      )}
    </form>
  );
}
