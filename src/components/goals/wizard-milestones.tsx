"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { trackFor, type Draft, type DraftMilestone } from "@/lib/goals/draft";
import type { Suggestion } from "@/lib/goals/suggest";
import { fmtValue } from "@/lib/format";
import type { SetDraft } from "./goal-wizard";
import { useT } from "@/lib/i18n/client";

export function MilestoneStep({ draft, set, editing, goalId, suggestion, target }: { draft: Draft; set: SetDraft; editing: boolean; goalId?: string; suggestion: Suggestion | null; target: number | null }) {
  const t = useT();
  const track = trackFor(draft);
  const isProject = draft.format === "project";
  const isTime = draft.format === "improvement" && draft.valueKind === "time";
  // Waarde-kolom alleen als de voortgang een getal is; bij stappen bepaalt de volgorde de voortgang.
  const valued = (draft.format === "achievement" && draft.hasQuantity) || draft.format === "numeric_target" || draft.format === "habit" || draft.format === "improvement";
  const valueLabel = isTime ? t("wizard.msTime") : draft.format === "habit" ? t("wizard.msTimes") : draft.quantityLabel || (draft.unit ? t("wizard.msValueUnit", { u: draft.unit }) : t("goalForm.msValue"));
  const ms = draft.milestones;
  const update = (i: number, patch: Partial<DraftMilestone>) => set({ milestones: ms.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= ms.length) return; const copy = [...ms]; [copy[i], copy[j]] = [copy[j], copy[i]]; set({ milestones: copy }); };
  const canReload = !editing && !!suggestion?.milestones?.length && suggestion.format === draft.format;
  const showRoutine = draft.format !== "habit";

  return (
    <section aria-labelledby="wz-ms">
      <h2 id="wz-ms" className="text-2xl sm:text-3xl">{isProject ? t("wizard.stepsTitle") : t("wizard.milestonesTitle")}</h2>
      <p className="t-muted mt-1 mb-5">{isProject ? t("wizard.stepsSub") : t("wizard.milestonesSub")}</p>

      {editing ? (
        <p className="tile soft-cloud p-4 text-sm">{t("wizard.milestonesEdit", { n: ms.length })} {goalId && <Link href={`/goals/${goalId}`} className="font-semibold text-blue-deep hover:underline">{t("wizard.toGoalPage")}</Link>}</p>
      ) : (
        <>
          <ol className="flex flex-col gap-2.5">
            {ms.map((m, i) => (
              <li key={i} className="tile soft-cloud p-3 grid gap-2 sm:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] items-center">
                <span className="grid place-items-center size-7 rounded-full bg-white text-blue-deep text-xs font-bold tnum shadow-[var(--shadow-press)]" aria-hidden>{i + 1}</span>
                <input aria-label={t("goalForm.msName")} value={m.name} onChange={(e) => update(i, { name: e.target.value })} className="ctl" placeholder={isProject ? t("wizard.stepName") : t("goalForm.msName")} maxLength={120} />
                {valued ? <input aria-label={valueLabel} value={m.value} onChange={(e) => update(i, { value: e.target.value })} className="ctl tnum" inputMode={isTime ? "text" : "decimal"} placeholder={isTime ? "1:59:00" : valueLabel} /> : <input aria-label={t("goalForm.msDate")} type="date" value={m.date} onChange={(e) => update(i, { date: e.target.value })} className="ctl" />}
                <input aria-label={t("goalForm.msReward")} value={m.reward} onChange={(e) => update(i, { reward: e.target.value })} className="ctl" placeholder={t("goalForm.msReward")} maxLength={120} />
                <span className="flex items-center justify-end">
                  {track === "steps" && <><button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-ink-3 hover:text-ink disabled:opacity-30" aria-label={t("wizard.moveUp")}><ArrowUp className="size-4" /></button><button type="button" onClick={() => move(i, 1)} disabled={i === ms.length - 1} className="p-1.5 text-ink-3 hover:text-ink disabled:opacity-30" aria-label={t("wizard.moveDown")}><ArrowDown className="size-4" /></button></>}
                  <button type="button" onClick={() => set({ milestones: ms.filter((_, j) => j !== i) })} className="p-1.5 text-ink-3 hover:text-coral-deep" aria-label={t("goalForm.msRemove")}><Trash2 className="size-4" /></button>
                </span>
              </li>
            ))}
          </ol>
          {ms.length === 0 && <p className="text-sm t-muted">{t("wizard.noMilestones")}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => set({ milestones: [...ms, { name: "", value: "", date: "", reward: "" }] })}><Plus className="size-4" aria-hidden /> {isProject ? t("wizard.addStep") : t("goalForm.addMilestone")}</Button>
            {canReload && <Button type="button" variant="secondary" size="sm" onClick={() => set({ milestones: suggestion!.milestones!.map((x) => ({ name: x.name, value: x.value !== undefined ? String(x.value).replace(".", ",") : "", date: "", reward: "" })) })}><RotateCcw className="size-4" aria-hidden /> {t("wizard.reloadSuggested")}</Button>}
          </div>
          {valued && target !== null && !Number.isNaN(target) && ms.length > 0 && <p className="text-xs t-muted mt-2">{t("wizard.msTargetHint", { v: fmtValue(target, isTime ? "time" : draft.format === "habit" ? "x" : draft.unit) })}</p>}
        </>
      )}

      {showRoutine && (
        <div className="mt-7 tile soft-mint p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={draft.routine.enabled} onChange={(e) => set({ routine: { ...draft.routine, enabled: e.target.checked, name: draft.routine.name || (e.target.checked ? t("wizard.routineDefault") : "") } })} className="accent-[#2FAE90] size-4 mt-1" />
            <span><span className="block font-display font-extrabold">{t("wizard.routineTitle")}</span><span className="block text-sm text-ink-2">{t("wizard.routineBody")}</span></span>
          </label>
          {draft.routine.enabled && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label={t("wizard.routineName")} htmlFor="wz-r-name" className="col-span-2"><input id="wz-r-name" value={draft.routine.name} onChange={(e) => set({ routine: { ...draft.routine, name: e.target.value } })} className="ctl" maxLength={120} /></Field>
              <Field label={t("wizard.howOften")} htmlFor="wz-r-times"><input id="wz-r-times" inputMode="numeric" value={draft.routine.times} onChange={(e) => set({ routine: { ...draft.routine, times: e.target.value.replace(/[^\d]/g, "").slice(0, 2) } })} className="ctl tnum" /></Field>
              <Field label={t("wizard.perPeriod")} htmlFor="wz-r-period"><select id="wz-r-period" className="ctl" value={draft.routine.period} onChange={(e) => set({ routine: { ...draft.routine, period: e.target.value as Draft["routine"]["period"] } })}>{(["day", "week", "month"] as const).map((p) => <option key={p} value={p}>{t(`wizard.per.${p}`)}</option>)}</select></Field>
              <Field label={t("wizard.routineTrack")} htmlFor="wz-r-track" className="col-span-2"><select id="wz-r-track" className="ctl" value={draft.routine.track} onChange={(e) => set({ routine: { ...draft.routine, track: e.target.value as Draft["routine"]["track"], unit: draft.routine.unit || draft.unit } })}>{(["sessions", "quantity", "both"] as const).map((k) => <option key={k} value={k}>{t(`wizard.routineTrackOpt.${k}`)}</option>)}</select></Field>
              {draft.routine.track !== "sessions" && <Field label={t("goalForm.unit")} htmlFor="wz-r-unit" className="col-span-2"><input id="wz-r-unit" value={draft.routine.unit} onChange={(e) => set({ routine: { ...draft.routine, unit: e.target.value } })} className="ctl" placeholder="km" maxLength={16} /></Field>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
