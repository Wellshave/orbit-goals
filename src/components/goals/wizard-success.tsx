"use client";

import { Field } from "@/components/ui";
import { FREQUENCIES } from "@/lib/periods";
import type { Draft, HMS } from "@/lib/goals/draft";
import type { SetDraft } from "./goal-wizard";
import { useT } from "@/lib/i18n/client";

type Props = { draft: Draft; set: SetDraft };
const isSport = (d: Draft) => ["run", "bike", "dumbbell"].includes(d.icon);

/** Uren, minuten en seconden als drie kleine velden in plaats van één algemeen getal. */
export function TimeFields({ idPrefix, value, onChange, legend }: { idPrefix: string; value: HMS; onChange: (v: HMS) => void; legend: string }) {
  const t = useT();
  const cell = (k: keyof HMS, label: string, max?: number) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${idPrefix}-${k}`} className="text-xs font-semibold t-muted">{label}</label>
      <input id={`${idPrefix}-${k}`} inputMode="numeric" value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })} className="ctl tnum w-20 text-center" placeholder="0" max={max} />
    </div>
  );
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-1.5">{legend}</legend>
      <div className="flex items-end gap-2">{cell("h", t("wizard.hours"))}<span className="pb-3 font-bold">:</span>{cell("m", t("wizard.minutes"), 59)}<span className="pb-3 font-bold">:</span>{cell("s", t("wizard.seconds"), 59)}</div>
    </fieldset>
  );
}

function ChoiceCards<V extends string>({ value, options, onChange, label }: { value: V; options: { v: V; title: string; body?: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`press text-left rounded-2xl border-2 p-3.5 bg-white ${value === o.v ? "border-blue shadow-[var(--shadow-card)]" : "border-line hover:border-ink-3"}`}>
          <span className="block font-semibold text-sm">{o.title}</span>
          {o.body && <span className="block text-xs t-muted mt-0.5">{o.body}</span>}
        </button>
      ))}
    </div>
  );
}

export function AchievementFields({ draft, set }: Props) {
  const t = useT();
  const sport = isSport(draft);
  const qLabel = draft.quantityLabel || (sport ? t("wizard.distance") : t("wizard.quantity"));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={sport ? t("wizard.eventDate") : t("wizard.whenAchieve")} htmlFor="wz-deadline" required><input id="wz-deadline" type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className="ctl" /></Field>
        <Field label={t("wizard.whatIsDone")} htmlFor="wz-criteria" hint={t("wizard.whatIsDoneHint")}><input id="wz-criteria" value={draft.criteria} onChange={(e) => set({ criteria: e.target.value })} className="ctl" placeholder={sport ? t("wizard.criteriaSport") : t("wizard.criteriaGeneric")} maxLength={160} /></Field>
      </div>

      <label className="inline-flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={draft.hasQuantity} onChange={(e) => set({ hasQuantity: e.target.checked })} className="accent-[#5B6CFF] size-4" />
        {sport ? t("wizard.hasDistance") : t("wizard.hasQuantity")}
      </label>
      {draft.hasQuantity && (
        <div className="grid grid-cols-[1fr_120px] gap-3 max-w-sm">
          <Field label={qLabel} htmlFor="wz-quantity" required><input id="wz-quantity" inputMode="decimal" value={draft.quantity} onChange={(e) => set({ quantity: e.target.value })} className="ctl tnum" placeholder={sport ? "21,1" : "1"} /></Field>
          <Field label={t("goalForm.unit")} htmlFor="wz-unit"><input id="wz-unit" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} className="ctl" placeholder={sport ? "km" : t("wizard.unitNeutral")} maxLength={16} /></Field>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold mb-2">{t("wizard.ambition")}</p>
        <ChoiceCards label={t("wizard.ambition")} value={draft.ambition} onChange={(ambition) => set({ ambition })} options={[
          { v: "finish", title: sport ? t("wizard.ambitionFinishSport") : t("wizard.ambitionFinish") },
          { v: "time", title: sport ? t("wizard.ambitionTimeSport") : t("wizard.ambitionTime") },
          { v: "pr", title: t("wizard.ambitionPr") },
        ]} />
        {draft.ambition === "time" && <div className="mt-4"><TimeFields idPrefix="wz-amb" legend={t("wizard.targetTime")} value={draft.time} onChange={(time) => set({ time })} /></div>}
      </div>

      {draft.hasQuantity && (
        <details className="tile soft-cloud p-4">
          <summary className="cursor-pointer font-semibold text-sm">{t("wizard.prepTitle")}</summary>
          <p className="text-xs t-muted mt-2 mb-3">{t("wizard.prepBody")}</p>
          <Field label={sport ? t("wizard.prepLongestSport") : t("wizard.prepLongest")} htmlFor="wz-prep" className="max-w-xs" hint={draft.unit ? t("wizard.inUnit", { u: draft.unit }) : undefined}><input id="wz-prep" inputMode="decimal" value={draft.prepLongest} onChange={(e) => set({ prepLongest: e.target.value })} className="ctl tnum" placeholder="0" /></Field>
        </details>
      )}
    </div>
  );
}

export function NumericFields({ draft, set }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("wizard.whatMeasure")} htmlFor="wz-unit" hint={t("wizard.whatMeasureHint")}><input id="wz-unit" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} className="ctl" placeholder={t("wizard.unitNeutral")} maxLength={16} /></Field>
        <Field label={t("wizard.currentValue")} htmlFor="wz-start-v" required><input id="wz-start-v" inputMode="decimal" value={draft.startValue} onChange={(e) => set({ startValue: e.target.value })} className="ctl tnum" placeholder="0" /></Field>
        <Field label={t("wizard.targetValue")} htmlFor="wz-target-v" required><input id="wz-target-v" inputMode="decimal" value={draft.targetValue} onChange={(e) => set({ targetValue: e.target.value })} className="ctl tnum" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("wizard.byWhen")} htmlFor="wz-deadline" required><input id="wz-deadline" type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className="ctl" /></Field>
        <Field label={t("wizard.updateFreq")} htmlFor="wz-freq-n"><select id="wz-freq-n" className="ctl" value={draft.frequency} onChange={(e) => set({ frequency: e.target.value as Draft["frequency"] })}>{FREQUENCIES.map((k) => <option key={k} value={k}>{t(`freq.${k}`)}</option>)}</select></Field>
      </div>
    </div>
  );
}

export function HabitFields({ draft, set, total, endDate }: Props & { total: number; endDate: string }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <p className="tile soft-mint p-4 text-sm"><span className="t-muted">{t("wizard.habitActivity")}</span> <span className="font-semibold">{draft.title}</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label={t("wizard.howOften")} htmlFor="wz-times" required><input id="wz-times" inputMode="numeric" value={draft.habitTimes} onChange={(e) => set({ habitTimes: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })} className="ctl tnum" /></Field>
        <Field label={t("wizard.perPeriod")} htmlFor="wz-period"><select id="wz-period" className="ctl" value={draft.habitPeriod} onChange={(e) => set({ habitPeriod: e.target.value as Draft["habitPeriod"] })}>{(["day", "week", "month"] as const).map((p) => <option key={p} value={p}>{t(`wizard.per.${p}`)}</option>)}</select></Field>
        <Field label={t("wizard.howLong")} htmlFor="wz-weeks" required hint={t("wizard.weeksHint")}><input id="wz-weeks" inputMode="numeric" value={draft.habitWeeks} onChange={(e) => set({ habitWeeks: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })} className="ctl tnum" /></Field>
      </div>
      <Field label={t("wizard.whenCounts")} htmlFor="wz-rule" hint={t("wizard.whenCountsHint")}><input id="wz-rule" value={draft.habitRule} onChange={(e) => set({ habitRule: e.target.value })} className="ctl" maxLength={160} placeholder={t("wizard.whenCountsPlaceholder")} /></Field>
      <p className="text-sm text-ink-2">{t("wizard.habitTotal", { total, date: endDate })}</p>
    </div>
  );
}

export function ImprovementFields({ draft, set }: Props) {
  const t = useT();
  const time = draft.valueKind === "time";
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud self-start" role="radiogroup" aria-label={t("wizard.valueKind")}>
        {(["number", "time"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={draft.valueKind === k} onClick={() => set({ valueKind: k, direction: k === "time" ? "lower" : draft.direction })} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full ${draft.valueKind === k ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{t(`wizard.kind.${k}`)}</button>
        ))}
      </div>
      {time ? (
        <div className="flex flex-wrap gap-8">
          <TimeFields idPrefix="wz-cur" legend={t("wizard.currentLevel")} value={draft.curTime} onChange={(curTime) => set({ curTime })} />
          <TimeFields idPrefix="wz-tgt" legend={t("wizard.targetLevel")} value={draft.tgtTime} onChange={(tgtTime) => set({ tgtTime })} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label={t("wizard.currentLevel")} htmlFor="wz-cur-n" required><input id="wz-cur-n" inputMode="decimal" value={draft.startValue} onChange={(e) => set({ startValue: e.target.value })} className="ctl tnum" /></Field>
          <Field label={t("wizard.targetLevel")} htmlFor="wz-tgt-n" required><input id="wz-tgt-n" inputMode="decimal" value={draft.targetValue} onChange={(e) => set({ targetValue: e.target.value })} className="ctl tnum" /></Field>
          <Field label={t("goalForm.unit")} htmlFor="wz-unit"><input id="wz-unit" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} className="ctl" placeholder={t("wizard.unitNeutral")} maxLength={16} /></Field>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold mb-2">{t("wizard.direction")}</p>
        <div className="inline-flex p-1 gap-1 rounded-full bg-cloud" role="radiogroup" aria-label={t("wizard.direction")}>
          {(["higher", "lower"] as const).map((dir) => (
            <button key={dir} type="button" role="radio" aria-checked={draft.direction === dir} onClick={() => set({ direction: dir })} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full ${draft.direction === dir ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{t(`wizard.dir.${dir}`)}</button>
          ))}
        </div>
      </div>
      <Field label={t("wizard.byWhen")} htmlFor="wz-deadline" required className="max-w-xs"><input id="wz-deadline" type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className="ctl" /></Field>
    </div>
  );
}

export function ProjectFields({ draft, set }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <Field label={t("wizard.deliverable")} htmlFor="wz-deliverable" hint={t("wizard.deliverableHint")}><input id="wz-deliverable" value={draft.deliverable} onChange={(e) => set({ deliverable: e.target.value })} className="ctl" maxLength={200} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("goalForm.deadline")} htmlFor="wz-deadline" required><input id="wz-deadline" type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className="ctl" /></Field>
        <Field label={t("wizard.doneDefinition")} htmlFor="wz-done" hint={t("wizard.doneDefinitionHint")}><input id="wz-done" value={draft.doneDefinition} onChange={(e) => set({ doneDefinition: e.target.value })} className="ctl" maxLength={200} /></Field>
      </div>
      <p className="text-sm t-muted">{t("wizard.projectNext")}</p>
    </div>
  );
}
