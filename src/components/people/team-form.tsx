"use client";

import { useActionState } from "react";
import { createTeam, updateTeam, setTeamMembership } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton, Avatar } from "@/components/ui";
import type { Profile, Team } from "@/lib/types";

const COLORS = ["#5B6CFF", "#9B72F2", "#FF7B6B", "#F6C85F", "#48CFAE", "#667085"];

export function TeamForm({ orgId, team }: { orgId: string; team?: Team }) {
  const [state, action] = useActionState(team ? updateTeam : createTeam, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />
      {team && <input type="hidden" name="id" value={team.id} />}
      <Field label="Naam" htmlFor="t-name" required><input id="t-name" name="name" required defaultValue={team?.name} className="ctl" placeholder="Marketing" /></Field>
      <Field label="Omschrijving" htmlFor="t-desc"><input id="t-desc" name="description" defaultValue={team?.description} className="ctl" /></Field>
      <fieldset><legend className="text-sm font-semibold mb-1.5">Kleur</legend>
        <div className="flex gap-2">{COLORS.map((c) => <label key={c} className="cursor-pointer"><input type="radio" name="color" value={c} defaultChecked={(team?.color ?? COLORS[0]) === c} className="sr-only peer" /><span className="block size-7 rounded-full border-2 border-transparent peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-blue" style={{ background: c }} aria-label={c} /></label>)}</div>
      </fieldset>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton pendingText="Opslaan…">{team ? "Team opslaan" : "Team aanmaken"}</SubmitButton>
    </form>
  );
}

export function TeamMembersEditor({ teamId, members, current }: { teamId: string; members: Profile[]; current: string[] }) {
  const notIn = members.filter((m) => !current.includes(m.id));
  return (
    <div className="tile soft-cloud p-3">
      <p className="t-label mb-2">Leden beheren</p>
      <ul className="flex flex-col gap-1">
        {members.filter((m) => current.includes(m.id)).map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <Avatar name={m.full_name} src={m.avatar_url} size="xs" /><span className="flex-1 truncate">{m.full_name}</span>
            <form action={setTeamMembership}><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="profile_id" value={m.id} /><input type="hidden" name="op" value="lead" /><button type="submit" className="text-xs t-muted hover:text-ink font-semibold">Lead</button></form>
            <form action={setTeamMembership}><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="profile_id" value={m.id} /><input type="hidden" name="op" value="remove" /><button type="submit" className="text-xs t-muted hover:text-coral-deep font-semibold">Verwijderen</button></form>
          </li>
        ))}
      </ul>
      {notIn.length > 0 && (
        <form action={setTeamMembership} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="op" value="add" />
          <label className="sr-only" htmlFor={`add-${teamId}`}>Teamlid toevoegen</label>
          <select id={`add-${teamId}`} name="profile_id" className="ctl !py-1.5 text-sm">{notIn.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
          <button type="submit" className="press text-xs font-semibold px-3.5 py-2 rounded-full bg-blue text-white whitespace-nowrap">Toevoegen</button>
        </form>
      )}
    </div>
  );
}
