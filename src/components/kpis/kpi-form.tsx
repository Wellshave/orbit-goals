"use client";

import { useActionState, useState } from "react";
import { createKpi, updateKpi } from "@/app/actions/kpis";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { PeoplePicker } from "@/components/people/people-picker";
import type { Kpi, KpiScope, Profile, Team } from "@/lib/types";
import { FREQUENCY_LABELS } from "@/lib/periods";

const CATEGORIES = ["Sales", "Marketing", "Service", "Operations", "Finance", "Product", "Algemeen"];

export function KpiForm({ kpi, members, teams, me, isAdmin, assignees = [] }: { kpi?: Kpi; members: Profile[]; teams: Team[]; me: Profile; isAdmin: boolean; assignees?: string[] }) {
  const [state, action] = useActionState(kpi ? updateKpi : createKpi, undefined);
  const [scope, setScope] = useState<KpiScope>(kpi?.scope ?? "personal");
  return (
    <form action={action} className="flex flex-col gap-6">
      {kpi && <input type="hidden" name="id" value={kpi.id} />}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Toewijzen aan" htmlFor="scope" required>
          <select id="scope" name="scope" className="ctl" value={scope} onChange={(e) => setScope(e.target.value as KpiScope)} disabled={!isAdmin}>
            <option value="personal">Persoon</option>
            {isAdmin && <option value="team">Team</option>}
            {isAdmin && <option value="company">Hele bedrijf</option>}
          </select>
          {!isAdmin && <input type="hidden" name="scope" value="personal" />}
        </Field>
        <Field label="Naam" htmlFor="name" required className="sm:col-span-2">
          <input id="name" name="name" required defaultValue={kpi?.name} className="ctl" placeholder="Bijv. Bol.com omzet per week" />
        </Field>
      </div>
      <Field label="Omschrijving" htmlFor="description">
        <textarea id="description" name="description" defaultValue={kpi?.description} className="ctl !min-h-16" />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Eigenaar" htmlFor="owner_id" required>
          <select id="owner_id" name="owner_id" className="ctl" defaultValue={kpi?.owner_id ?? me.id} disabled={!isAdmin}>
            {(isAdmin ? members : [me]).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          {!isAdmin && <input type="hidden" name="owner_id" value={me.id} />}
        </Field>
        <Field label="Team" htmlFor="team_id" required={scope === "team"}>
          <select id="team_id" name="team_id" className="ctl" defaultValue={kpi?.team_id ?? ""}>
            <option value="">Geen team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Categorie" htmlFor="category">
          <input id="category" name="category" list="kpi-categories" defaultValue={kpi?.category ?? ""} className="ctl" />
          <datalist id="kpi-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Field label="Frequentie" htmlFor="frequency" required>
          <select id="frequency" name="frequency" className="ctl" defaultValue={kpi?.frequency ?? "weekly"}>
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Target" htmlFor="target_value" required>
          <input id="target_value" name="target_value" inputMode="decimal" required defaultValue={kpi?.target_value ?? ""} className="ctl tnum" />
        </Field>
        <Field label="Eenheid" htmlFor="unit" hint="€, %, x, orders…">
          <input id="unit" name="unit" defaultValue={kpi?.unit ?? ""} className="ctl tnum" />
        </Field>
        <Field label="Richting" htmlFor="direction">
          <select id="direction" name="direction" className="ctl" defaultValue={kpi?.direction ?? "higher_better"}>
            <option value="higher_better">Hoger is beter</option>
            <option value="lower_better">Lager is beter</option>
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Geldig vanaf" htmlFor="period_start" required>
          <input id="period_start" name="period_start" type="date" required defaultValue={kpi?.period_start ?? new Date().toISOString().slice(0, 10)} className="ctl" />
        </Field>
        <Field label="Deadline / einde periode" htmlFor="period_end">
          <input id="period_end" name="period_end" type="date" defaultValue={kpi?.period_end ?? ""} className="ctl" />
        </Field>
        <Field label="Bron of toelichting" htmlFor="source_note" hint="Waar komt het getal vandaan?">
          <input id="source_note" name="source_note" defaultValue={kpi?.source_note} className="ctl" placeholder="Shopify Analytics" />
        </Field>
      </div>
      {isAdmin && scope !== "company" && (
        <Field label="Toegewezen aan" htmlFor="assignee" hint="Deze personen vullen de check-ins in.">
          <PeoplePicker name="assignee" members={members} selected={assignees.length ? assignees : kpi ? [] : [me.id]} legend="Toegewezen personen" />
        </Field>
      )}
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton size="lg" pendingText="Opslaan…">{kpi ? "Wijzigingen opslaan" : "KPI aanmaken"}</SubmitButton>
    </form>
  );
}
