"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { checkinKpi } from "@/app/actions/kpis";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Kpi, KpiCheckin } from "@/lib/types";
import { periodLabel, toISODate } from "@/lib/periods";
import { fmtValue, fmtDate } from "@/lib/format";
import { kpiHit } from "@/lib/status";

/** Check-in: groot invoerveld, positieve knop, directe feedback en een bevredigend vinkje. */
export function CheckinForm({ kpi, period, existing, back, compact = false }: { kpi: Kpi; period: { start: Date; end: Date }; existing?: KpiCheckin | null; back?: string; compact?: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [done, setDone] = useState<{ hit: boolean; value: number } | null>(null);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof checkinKpi>>, fd: FormData) => {
    const result = await checkinKpi(prev, fd);
    if (result?.success) {
      const raw = String(fd.get("value") ?? "").replace(",", ".");
      const value = raw === "" ? Number(kpi.target_value) : Number(raw);
      setDone({ hit: kpiHit(kpi, value), value });
      setTimeout(() => router.refresh(), reduce ? 300 : 1500);
    }
    return result;
  }, undefined);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={`tile p-4 flex items-center gap-3 ${done.hit ? "soft-mint" : "soft-sky"}`} role="status">
          <motion.span initial={reduce ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className={`clay size-11 ${done.hit ? "bg-mint text-white" : "bg-blue text-white"}`}><Check className="size-6" strokeWidth={3} /></motion.span>
          <div>
            <p className="font-display font-extrabold">{done.hit ? "Mooi! Target gehaald." : "Opgeslagen. Dankjewel!"}</p>
            <p className="text-sm t-muted">{done.hit ? `${fmtValue(done.value, kpi.unit)} · je ligt deze periode op schema.` : `${fmtValue(done.value, kpi.unit)} van ${fmtValue(kpi.target_value, kpi.unit)} · elke check-in telt mee.`}</p>
          </div>
        </motion.div>
      ) : (
        <motion.form key="form" action={action} className="flex flex-col gap-3" exit={{ opacity: 0 }}>
          <input type="hidden" name="kpi_id" value={kpi.id} />
          <input type="hidden" name="period_start" value={toISODate(period.start)} />
          <input type="hidden" name="period_end" value={toISODate(period.end)} />
          {back && <input type="hidden" name="back" value={back} />}
          {!compact && (
            <p className="text-sm t-muted">
              {periodLabel(kpi.frequency, period.start)} · {fmtDate(period.start, "d MMM")} – {fmtDate(period.end, "d MMM")} · target <strong className="text-ink">{fmtValue(kpi.target_value, kpi.unit)}</strong>
            </p>
          )}
          <div className={`grid gap-3 ${compact ? "grid-cols-[1fr_auto] items-end" : "sm:grid-cols-[220px_1fr]"}`}>
            <Field label={compact ? `Waarde${kpi.unit ? ` (${kpi.unit})` : ""}` : `Jouw waarde${kpi.unit ? ` in ${kpi.unit}` : ""}`} htmlFor={`v-${kpi.id}`} required>
              <input id={`v-${kpi.id}`} name="value" inputMode="decimal" defaultValue={existing?.value ?? ""} className="ctl ctl-lg tnum" placeholder={String(kpi.target_value)} autoComplete="off" />
            </Field>
            {!compact && (
              <Field label="Korte toelichting" htmlFor={`n-${kpi.id}`}>
                <input id={`n-${kpi.id}`} name="note" defaultValue={existing?.note ?? ""} className="ctl" placeholder="Wat speelde er? (optioneel)" />
              </Field>
            )}
            {compact && <SubmitButton variant="mint" size="lg" pendingText="…">{existing ? "Bijwerken" : "Check-in opslaan"}</SubmitButton>}
          </div>
          <FormMessage error={state?.error} />
          {!compact && (
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variant="mint" size="lg" pendingText="Opslaan…">{existing ? "Check-in bijwerken" : "Check-in opslaan"}</SubmitButton>
              <label className="inline-flex items-center gap-2 text-sm t-muted"><input type="checkbox" name="done" className="accent-[#48CFAE] size-4" /> Leeg laten = target gehaald</label>
            </div>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
