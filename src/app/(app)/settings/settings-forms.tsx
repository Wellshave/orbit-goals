"use client";

import { useActionState, useState } from "react";
import { Copy, Check } from "lucide-react";
import { inviteMember, removeMember, setMemberRole, updateOrganization } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Organization, Profile } from "@/lib/types";

export function OrgForm({ org }: { org: Organization }) {
  const [state, action] = useActionState(updateOrganization, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-4">
      <input type="hidden" name="id" value={org.id} />
      <Field label="Organisatienaam" htmlFor="org-name" required><input id="org-name" name="name" required defaultValue={org.name} className="ctl" /></Field>
      <Field label="Productnaam" htmlFor="org-product" hint="De naam van dit dashboard, bijv. Orbit."><input id="org-product" name="product_name" defaultValue={org.product_name} className="ctl" /></Field>
      <div className="sm:col-span-2 flex items-center gap-3"><SubmitButton size="sm" pendingText="Opslaan…">Organisatie opslaan</SubmitButton><FormMessage error={state?.error} success={state?.success} /></div>
    </form>
  );
}

export function InviteForm({ orgId }: { orgId: string }) {
  const [state, action] = useActionState(inviteMember, undefined);
  const [copied, setCopied] = useState(false);
  const link = state?.data?.link;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="org_id" value={orgId} />
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
        <Field label="E-mailadres" htmlFor="inv-email" required><input id="inv-email" name="email" type="email" required className="ctl" placeholder="collega@bedrijf.nl" /></Field>
        <Field label="Rol" htmlFor="inv-role"><select id="inv-role" name="role" className="ctl" defaultValue="member"><option value="member">Teamlid</option><option value="admin">Admin</option></select></Field>
        <SubmitButton pendingText="Aanmaken…">Uitnodigingslink maken</SubmitButton>
      </div>
      <FormMessage error={state?.error} success={link ? undefined : state?.success} />
      {link && (
        <div className="tile soft-mint p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs t-muted">Deel deze link:</span>
          <code className="text-xs bg-white px-2 py-1 rounded-lg select-all break-all flex-1">{link}</code>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-deep">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Gekopieerd" : "Kopiëren"}</button>
        </div>
      )}
    </form>
  );
}

export function MemberRow({ member, me }: { member: Profile; me: Profile }) {
  const [rState, rAction] = useActionState(setMemberRole, undefined);
  const [dState, dAction] = useActionState(removeMember, undefined);
  const isSelf = member.id === me.id;
  const isOwner = member.role === "owner";
  const iAmOwner = me.role === "owner";
  return (
    <div className="flex items-center gap-2">
      <form action={rAction} className="flex items-center gap-1.5">
        <input type="hidden" name="profile_id" value={member.id} />
        <label className="sr-only" htmlFor={`role-${member.id}`}>Rol van {member.full_name}</label>
        <select id={`role-${member.id}`} name="role" defaultValue={member.role} className="ctl !w-auto !py-1 text-xs" disabled={isSelf || (isOwner && !iAmOwner)} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="member">Teamlid</option><option value="admin">Admin</option><option value="owner" disabled={!iAmOwner}>Owner</option>
        </select>
      </form>
      {!isSelf && !isOwner && (
        <form action={dAction}>
          <input type="hidden" name="profile_id" value={member.id} />
          <button type="submit" className="text-xs t-muted hover:text-coral-deep font-semibold" onClick={(e) => !confirm(`${member.full_name} uit de organisatie verwijderen?`) && e.preventDefault()}>Verwijderen</button>
        </form>
      )}
      {(rState?.error || dState?.error) && <span className="text-xs text-coral-deep" role="alert">{rState?.error ?? dState?.error}</span>}
    </div>
  );
}
