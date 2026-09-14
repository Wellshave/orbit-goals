"use client";

import { useActionState, useState } from "react";
import { createKpi, updateKpi } from "@/app/actions/kpis";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { PeoplePicker } from "@/components/people/people-picker";
import type { Kpi, KpiScope, Profile, Team } from "@/lib/types";
import { FREQUENCIES } from "@/lib/periods";
import { useT } from "@/lib/i18n/client";

const CATEGORIES = ["Sales", "Marketing", "Service", "Operations", "Finance", "Product", "Algemeen"];

export function KpiForm({ kpi, members, teams, me, isAdmin, assignees = [] }: { kpi?: Kpi; members: Profile[]; teams: Team[]; me: Profile; isAdmin: boolean; assignees?: string[] }) {
  const t = useT();
  const [state, action] = useActionState(kpi ? updateKpi : createKpi, undefined);
  const [scope, setScope] = useState<KpiScope>(kpi?.scope ?? "personal");
  return (
    <form action={action} className="flex flex-col gap-6">
      {kpi && <input type="hidden" name="id" value={kpi.id} />}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("kpiForm.assignTo")} htmlFor="scope" required>
          <select id="scope" name="scope" className="ctl" value={scope} onChange={(e) => setScope(e.target.value as KpiScope)} disabled={!isAdmin}>
            <option value="personal">{t("kpiForm.personOpt")}</option>
            {isAdmin && <option value="team">{t("kpiForm.teamOpt")}</option>}
            {isAdmin && <option value="company">{t("kpiForm.companyOpt")}</option>}
          </select>
          {!isAdmin && <input type="hidden" name="scope" value="personal" />}
        </Field>
        <Field label={t("kpiForm.nameLabel")} htmlFor="name" required className="sm:col-span-2">
          <input id="name" name="name" required defaultValue={kpi?.name} className="ctl" placeholder={t("kpiForm.namePlaceholder")} />
        </Field>
      </div>
      <Field label={t("common.description")} htmlFor="description">
        <textarea id="description" name="description" defaultValue={kpi?.description} className="ctl !min-h-16" />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("kpiForm.owner")} htmlFor="owner_id" required>
          <select id="owner_id" name="owner_id" className="ctl" defaultValue={kpi?.owner_id ?? me.id} disabled={!isAdmin}>
            {(isAdmin ? members : [me]).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          {!isAdmin && <input type="hidden" name="owner_id" value={me.id} />}
        </Field>
        <Field label={t("common.team")} htmlFor="team_id" required={scope === "team"}>
          <select id="team_id" name="team_id" className="ctl" defaultValue={kpi?.team_id ?? ""}>
            <option value="">{t("common.noTeam")}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("common.category")} htmlFor="category">
          <input id="category" name="category" list="kpi-categories" defaultValue={kpi?.category ?? ""} className="ctl" />
          <datalist id="kpi-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Field label={t("kpiForm.frequency")} htmlFor="frequency" required>
          <select id="frequency" name="frequency" className="ctl" defaultValue={kpi?.frequency ?? "weekly"}>
            {FREQUENCIES.map((k) => (
              <option key={k} value={k}>{t(`freq.${k}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t("kpiForm.target")} htmlFor="target_value" required>
          <input id="target_value" name="target_value" inputMode="decimal" required defaultValue={kpi?.target_value ?? ""} className="ctl tnum" />
        </Field>
        <Field label={t("kpiForm.unit")} htmlFor="unit" hint={t("kpiForm.unitHint")}>
          <input id="unit" name="unit" defaultValue={kpi?.unit ?? ""} className="ctl tnum" />
        </Field>
        <Field label={t("kpiForm.direction")} htmlFor="direction">
          <select id="direction" name="direction" className="ctl" defaultValue={kpi?.direction ?? "higher_better"}>
            <option value="higher_better">{t("kpiForm.higher")}</option>
            <option value="lower_better">{t("kpiForm.lower")}</option>
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t("kpiForm.validFrom")} htmlFor="period_start" required>
          <input id="period_start" name="period_start" type="date" required defaultValue={kpi?.period_start ?? new Date().toISOString().slice(0, 10)} className="ctl" />
        </Field>
        <Field label={t("kpiForm.periodEnd")} htmlFor="period_end">
          <input id="period_end" name="period_end" type="date" defaultValue={kpi?.period_end ?? ""} className="ctl" />
        </Field>
        <Field label={t("kpiForm.source")} htmlFor="source_note" hint={t("kpiForm.sourceHint")}>
          <input id="source_note" name="source_note" defaultValue={kpi?.source_note} className="ctl" placeholder={t("kpiForm.sourcePlaceholder")} />
        </Field>
      </div>
      {isAdmin && scope !== "company" && (
        <Field label={t("kpiForm.assigned")} htmlFor="assignee" hint={t("kpiForm.assignedHint")}>
          <PeoplePicker name="assignee" members={members} selected={assignees.length ? assignees : kpi ? [] : [me.id]} legend={t("kpiForm.assignedLegend")} />
        </Field>
      )}
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton size="lg" pendingText={t("common.saving")}>{kpi ? t("kpiForm.saveChanges") : t("kpiForm.create")}</SubmitButton>
    </form>
  );
}
