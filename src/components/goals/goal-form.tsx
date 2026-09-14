"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createGoal, updateGoal } from "@/app/actions/goals";
import { Field, FormMessage, SubmitButton, Button } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { PeoplePicker } from "@/components/people/people-picker";
import type { Goal, GoalType, Profile, Team, Visibility } from "@/lib/types";
import { FREQUENCIES } from "@/lib/periods";
import { useT } from "@/lib/i18n/client";

const CATEGORIES = ["Omzet", "Retentie", "Product", "Content", "Advertising", "Influencers", "Service", "Operations", "Discipline", "Persoonlijk", "Algemeen"];

export function GoalForm({ goal, members, teams, goals, me, isAdmin, assignees = [], shares = [] }: { goal?: Goal; members: Profile[]; teams: Team[]; goals: Goal[]; me: Profile; isAdmin: boolean; assignees?: string[]; shares?: string[] }) {
  const t = useT();
  const [state, action, isPending] = useActionState(goal ? updateGoal : createGoal, undefined);
  const [type, setType] = useState<GoalType>(goal?.goal_type ?? "personal");
  const [measure, setMeasure] = useState(goal?.measure ?? "numeric");
  const [visibility, setVisibility] = useState<Visibility>(goal?.visibility ?? "private");
  const [ms, setMs] = useState<{ name: string; target: string; date: string; reward: string }[]>([]);

  const visOptions: Visibility[] = type === "company" ? ["company"] : type === "team" ? ["team", "company"] : ["private", "shared", "team", "company"];
  const effectiveVis = visOptions.includes(visibility) ? visibility : visOptions[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ActionForm action={action} pending={isPending} className="flex flex-col gap-6">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("goalForm.type")} htmlFor="goal_type" required className="sm:col-span-1">
          <select id="goal_type" name="goal_type" className="ctl" value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            <option value="personal">{t("goalType.personal")}</option>
            {isAdmin && <option value="team">{t("goalType.team")}</option>}
            {isAdmin && <option value="company">{t("goalType.company")}</option>}
          </select>
        </Field>
        <Field label={t("goalForm.titleLabel")} htmlFor="title" required className="sm:col-span-2">
          <input id="title" name="title" required defaultValue={goal?.title} className="ctl" placeholder={t("goalForm.titlePlaceholder")} />
        </Field>
      </div>
      <Field label={t("common.description")} htmlFor="description" hint={t("goalForm.descHint")}>
        <textarea id="description" name="description" defaultValue={goal?.description} className="ctl" />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("goalForm.owner")} htmlFor="owner_id" required>
          <select id="owner_id" name="owner_id" className="ctl" defaultValue={goal?.owner_id ?? me.id} disabled={!isAdmin && type === "personal"}>
            {(isAdmin ? members : [me]).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          {!isAdmin && type === "personal" && <input type="hidden" name="owner_id" value={me.id} />}
        </Field>
        <Field label={t("common.team")} htmlFor="team_id" required={type === "team"}>
          <select id="team_id" name="team_id" className="ctl" defaultValue={goal?.team_id ?? ""}>
            <option value="">{t("common.noTeam")}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("common.category")} htmlFor="category">
          <input id="category" name="category" list="goal-categories" defaultValue={goal?.category ?? ""} className="ctl" placeholder={t("goalForm.categoryPlaceholder")} />
          <datalist id="goal-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("goalForm.start")} htmlFor="start_date" required>
          <input id="start_date" name="start_date" type="date" required defaultValue={goal?.start_date ?? today} className="ctl" />
        </Field>
        <Field label={t("goalForm.deadline")} htmlFor="deadline" required>
          <input id="deadline" name="deadline" type="date" required defaultValue={goal?.deadline ?? ""} className="ctl" />
        </Field>
        <Field label={t("goalDetail.measureFreq")} htmlFor="frequency">
          <select id="frequency" name="frequency" className="ctl" defaultValue={goal?.frequency ?? "weekly"}>
            {FREQUENCIES.map((k) => (
              <option key={k} value={k}>{t(`freq.${k}`)}</option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="tile soft-cloud p-4">
        <legend className="t-label px-1">{t("goalForm.measure")}</legend>
        <div className="flex gap-4 mt-2 mb-4">
          {(["numeric", "binary"] as const).map((m) => (
            <label key={m} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="measure" value={m} checked={measure === m} onChange={() => setMeasure(m)} className="accent-[#5B6CFF]" />
              {m === "numeric" ? t("goalForm.numeric") : t("goalForm.binary")}
            </label>
          ))}
        </div>
        {measure === "numeric" && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t("goalForm.unit")} htmlFor="unit" hint={t("goalForm.unitHint")}>
              <input id="unit" name="unit" defaultValue={goal?.unit ?? ""} className="ctl tnum" placeholder="€" />
            </Field>
            <Field label={t("goalForm.startValue")} htmlFor="start_value" required>
              <input id="start_value" name="start_value" inputMode="decimal" defaultValue={goal?.start_value ?? 0} className="ctl tnum" />
            </Field>
            <Field label={t("goalForm.targetValue")} htmlFor="target_value" required>
              <input id="target_value" name="target_value" inputMode="decimal" required defaultValue={goal?.target_value ?? ""} className="ctl tnum" placeholder="3000000" />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("goalForm.visibility")} htmlFor="visibility" required hint={type === "company" ? t("goalForm.visHintCompany") : t("goalForm.visHint")}>
          <select id="visibility" name="visibility" className="ctl" value={effectiveVis} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            {visOptions.map((v) => (
              <option key={v} value={v}>{t(`visibility.${v}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t("goalForm.parent")} htmlFor="parent_goal_id" hint={t("goalForm.parentHint")}>
          <select id="parent_goal_id" name="parent_goal_id" className="ctl" defaultValue={goal?.parent_goal_id ?? ""}>
            <option value="">{t("common.none")}</option>
            {goals.filter((g) => g.id !== goal?.id).map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("goalForm.responsible")} htmlFor="assignee" hint={t("goalForm.responsibleHint")}>
          <PeoplePicker name="assignee" members={members} selected={assignees} legend={t("goalForm.responsibleLegend")} />
        </Field>
        {effectiveVis === "shared" && (
          <Field label={t("goalForm.shareWith")} htmlFor="share" hint={t("goalForm.shareHint")}>
            <PeoplePicker name="share" members={members} selected={shares} legend={t("goalForm.sharedLegend")} exclude={[me.id]} />
          </Field>
        )}
      </div>

      {isAdmin && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_featured" defaultChecked={goal?.is_featured} className="accent-[#5B6CFF] size-4" />
          {t("goalForm.featured")}
        </label>
      )}

      {!goal && measure === "numeric" && (
        <fieldset className="tile soft-cloud p-4">
          <legend className="t-label px-1">{t("goalForm.milestonesOpt")}</legend>
          <p className="text-xs t-muted mt-1 mb-3">{t("goalForm.milestonesHint")}</p>
          <ul className="flex flex-col gap-2">
            {ms.map((m, i) => (
              <li key={i} className="grid grid-cols-[1fr_110px_140px_1fr_auto] gap-2 items-center max-sm:grid-cols-2">
                <input name="ms_name" value={m.name} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="ctl" placeholder={t("goalForm.msName")} aria-label={t("goalForm.msName")} required />
                <input name="ms_target" value={m.target} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className="ctl tnum" placeholder={t("goalForm.msValue")} inputMode="decimal" aria-label={t("goalForm.msValue")} required />
                <input name="ms_date" type="date" value={m.date} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className="ctl" aria-label={t("goalForm.msDate")} />
                <input name="ms_reward" value={m.reward} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, reward: e.target.value } : x)))} className="ctl" placeholder={t("goalForm.msReward")} aria-label={t("goalForm.msReward")} />
                <button type="button" onClick={() => setMs(ms.filter((_, j) => j !== i))} className="p-2 text-ink-3 hover:text-coral-deep" aria-label={t("goalForm.msRemove")}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMs([...ms, { name: "", target: "", date: "", reward: "" }])}>
              <Plus className="size-4" aria-hidden /> {t("goalForm.addMilestone")}
            </Button>
            {ms.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs t-muted">
                <input type="checkbox" name="last_is_ultimate" defaultChecked className="accent-[#9B72F2]" /> {t("goalForm.lastUltimate")}
              </label>
            )}
          </div>
        </fieldset>
      )}

      <FormMessage error={state?.error} success={state?.success} />
      <div className="flex items-center gap-3">
        <SubmitButton size="lg" pendingText={t("common.saving")}>{goal ? t("goalForm.saveChanges") : t("goalForm.create")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
