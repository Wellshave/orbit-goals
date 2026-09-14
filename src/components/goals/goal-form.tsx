"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createGoal, updateGoal } from "@/app/actions/goals";
import { Field, FormMessage, SubmitButton, Button } from "@/components/ui";
import { PeoplePicker } from "@/components/people/people-picker";
import type { Goal, GoalType, Profile, Team, Visibility } from "@/lib/types";
import { FREQUENCY_LABELS } from "@/lib/periods";
import { VISIBILITY_LABELS } from "@/lib/status";

const CATEGORIES = ["Omzet", "Retentie", "Product", "Content", "Advertising", "Influencers", "Service", "Operations", "Discipline", "Persoonlijk", "Algemeen"];

export function GoalForm({ goal, members, teams, goals, me, isAdmin, assignees = [], shares = [] }: { goal?: Goal; members: Profile[]; teams: Team[]; goals: Goal[]; me: Profile; isAdmin: boolean; assignees?: string[]; shares?: string[] }) {
  const [state, action] = useActionState(goal ? updateGoal : createGoal, undefined);
  const [type, setType] = useState<GoalType>(goal?.goal_type ?? "personal");
  const [measure, setMeasure] = useState(goal?.measure ?? "numeric");
  const [visibility, setVisibility] = useState<Visibility>(goal?.visibility ?? "private");
  const [ms, setMs] = useState<{ name: string; target: string; date: string; reward: string }[]>([]);

  const visOptions: Visibility[] = type === "company" ? ["company"] : type === "team" ? ["team", "company"] : ["private", "shared", "team", "company"];
  const effectiveVis = visOptions.includes(visibility) ? visibility : visOptions[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-col gap-6">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Type doel" htmlFor="goal_type" required className="sm:col-span-1">
          <select id="goal_type" name="goal_type" className="ctl" value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            <option value="personal">Persoonlijk</option>
            {isAdmin && <option value="team">Team</option>}
            {isAdmin && <option value="company">Company</option>}
          </select>
        </Field>
        <Field label="Titel" htmlFor="title" required className="sm:col-span-2">
          <input id="title" name="title" required defaultValue={goal?.title} className="ctl" placeholder="Bijv. €3.000.000 jaaromzet in 2026" />
        </Field>
      </div>
      <Field label="Omschrijving" htmlFor="description" hint="Wat telt mee, en hoe wordt het gemeten?">
        <textarea id="description" name="description" defaultValue={goal?.description} className="ctl" />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Eigenaar" htmlFor="owner_id" required>
          <select id="owner_id" name="owner_id" className="ctl" defaultValue={goal?.owner_id ?? me.id} disabled={!isAdmin && type === "personal"}>
            {(isAdmin ? members : [me]).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          {!isAdmin && type === "personal" && <input type="hidden" name="owner_id" value={me.id} />}
        </Field>
        <Field label="Team" htmlFor="team_id" required={type === "team"}>
          <select id="team_id" name="team_id" className="ctl" defaultValue={goal?.team_id ?? ""}>
            <option value="">Geen team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Categorie" htmlFor="category">
          <input id="category" name="category" list="goal-categories" defaultValue={goal?.category ?? ""} className="ctl" placeholder="Omzet, Content…" />
          <datalist id="goal-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Startdatum" htmlFor="start_date" required>
          <input id="start_date" name="start_date" type="date" required defaultValue={goal?.start_date ?? today} className="ctl" />
        </Field>
        <Field label="Deadline" htmlFor="deadline" required>
          <input id="deadline" name="deadline" type="date" required defaultValue={goal?.deadline ?? ""} className="ctl" />
        </Field>
        <Field label="Meetfrequentie" htmlFor="frequency">
          <select id="frequency" name="frequency" className="ctl" defaultValue={goal?.frequency ?? "weekly"}>
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="tile soft-cloud p-4">
        <legend className="t-label px-1">Meting</legend>
        <div className="flex gap-4 mt-2 mb-4">
          {(["numeric", "binary"] as const).map((m) => (
            <label key={m} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="measure" value={m} checked={measure === m} onChange={() => setMeasure(m)} className="accent-[#5B6CFF]" />
              {m === "numeric" ? "Numeriek (waarde richting target)" : "Binair (klaar / niet klaar)"}
            </label>
          ))}
        </div>
        {measure === "numeric" && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Eenheid" htmlFor="unit" hint="€, %, x, video's…">
              <input id="unit" name="unit" defaultValue={goal?.unit ?? ""} className="ctl tnum" placeholder="€" />
            </Field>
            <Field label="Startwaarde" htmlFor="start_value" required>
              <input id="start_value" name="start_value" inputMode="decimal" defaultValue={goal?.start_value ?? 0} className="ctl tnum" />
            </Field>
            <Field label="Targetwaarde" htmlFor="target_value" required>
              <input id="target_value" name="target_value" inputMode="decimal" required defaultValue={goal?.target_value ?? ""} className="ctl tnum" placeholder="3000000" />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Zichtbaarheid" htmlFor="visibility" required hint={type === "company" ? "Company goals zijn altijd voor iedereen zichtbaar." : "Privédoelen zijn alleen voor jou zichtbaar, ook niet voor admins."}>
          <select id="visibility" name="visibility" className="ctl" value={effectiveVis} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            {visOptions.map((v) => (
              <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>
            ))}
          </select>
        </Field>
        <Field label="Parent goal" htmlFor="parent_goal_id" hint="Draagt dit doel bij aan een groter doel?">
          <select id="parent_goal_id" name="parent_goal_id" className="ctl" defaultValue={goal?.parent_goal_id ?? ""}>
            <option value="">Geen</option>
            {goals.filter((g) => g.id !== goal?.id).map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Verantwoordelijke teamleden" htmlFor="assignee" hint="Zij mogen voortgang toevoegen en delen in milestone-punten.">
          <PeoplePicker name="assignee" members={members} selected={assignees} legend="Verantwoordelijken" />
        </Field>
        {effectiveVis === "shared" && (
          <Field label="Delen met" htmlFor="share" hint="Alleen deze personen zien dit doel.">
            <PeoplePicker name="share" members={members} selected={shares} legend="Gedeeld met" exclude={[me.id]} />
          </Field>
        )}
      </div>

      {isAdmin && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_featured" defaultChecked={goal?.is_featured} className="accent-[#5B6CFF] size-4" />
          Uitgelicht op het company dashboard (Goal Orbit)
        </label>
      )}

      {!goal && measure === "numeric" && (
        <fieldset className="tile soft-cloud p-4">
          <legend className="t-label px-1">Milestones (optioneel)</legend>
          <p className="text-xs t-muted mt-1 mb-3">Tussendoelen met een reward. Je kunt ze later ook op de doelpagina beheren.</p>
          <ul className="flex flex-col gap-2">
            {ms.map((m, i) => (
              <li key={i} className="grid grid-cols-[1fr_110px_140px_1fr_auto] gap-2 items-center max-sm:grid-cols-2">
                <input name="ms_name" value={m.name} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="ctl" placeholder="Naam" aria-label="Milestone naam" required />
                <input name="ms_target" value={m.target} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className="ctl tnum" placeholder="Waarde" inputMode="decimal" aria-label="Targetwaarde" required />
                <input name="ms_date" type="date" value={m.date} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className="ctl" aria-label="Streefdatum" />
                <input name="ms_reward" value={m.reward} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, reward: e.target.value } : x)))} className="ctl" placeholder="Reward (optioneel)" aria-label="Reward" />
                <button type="button" onClick={() => setMs(ms.filter((_, j) => j !== i))} className="p-2 text-ink-3 hover:text-coral-deep" aria-label="Milestone verwijderen">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMs([...ms, { name: "", target: "", date: "", reward: "" }])}>
              <Plus className="size-4" aria-hidden /> Milestone toevoegen
            </Button>
            {ms.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs t-muted">
                <input type="checkbox" name="last_is_ultimate" defaultChecked className="accent-[#9B72F2]" /> Laatste milestone is het ultimate goal
              </label>
            )}
          </div>
        </fieldset>
      )}

      <FormMessage error={state?.error} success={state?.success} />
      <div className="flex items-center gap-3">
        <SubmitButton size="lg" pendingText="Opslaan…">{goal ? "Wijzigingen opslaan" : "Doel aanmaken"}</SubmitButton>
      </div>
    </form>
  );
}
