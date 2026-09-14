"use client";

import { useActionState, useState } from "react";
import { Copy, Check } from "lucide-react";
import { inviteMember, removeMember, setMemberRole, updateOrganization } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import type { Organization, Profile } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function OrgForm({ org }: { org: Organization }) {
  const [state, action] = useActionState(updateOrganization, undefined);
  const t = useT();
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-4">
      <input type="hidden" name="id" value={org.id} />
      <Field label={t("settings.orgName")} htmlFor="org-name" required><input id="org-name" name="name" required defaultValue={org.name} className="ctl" /></Field>
      <Field label={t("settings.productName")} htmlFor="org-product" hint={t("settings.productHint")}><input id="org-product" name="product_name" defaultValue={org.product_name} className="ctl" /></Field>
      <div className="sm:col-span-2 flex items-center gap-3"><SubmitButton size="sm" pendingText={t("common.saving")}>{t("settings.saveOrg")}</SubmitButton><FormMessage error={state?.error} success={state?.success} /></div>
    </form>
  );
}

export function InviteForm({ orgId }: { orgId: string }) {
  const [state, action] = useActionState(inviteMember, undefined);
  const [copied, setCopied] = useState(false);
  const t = useT();
  const link = state?.data?.link;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="org_id" value={orgId} />
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
        <Field label={t("settings.email")} htmlFor="inv-email" required><input id="inv-email" name="email" type="email" required className="ctl" placeholder="collega@bedrijf.nl" /></Field>
        <Field label={t("settings.role")} htmlFor="inv-role"><select id="inv-role" name="role" className="ctl" defaultValue="member"><option value="member">{t("role.member")}</option><option value="admin">{t("role.admin")}</option></select></Field>
        <SubmitButton pendingText={t("settings.making")}>{t("settings.makeLink")}</SubmitButton>
      </div>
      <FormMessage error={state?.error} success={link ? undefined : state?.success} />
      {link && (
        <div className="tile soft-mint p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs t-muted">{t("settings.shareLink")}</span>
          <code className="text-xs bg-white px-2 py-1 rounded-lg select-all break-all flex-1">{link}</code>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-deep">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? t("settings.copied") : t("settings.copy")}</button>
        </div>
      )}
    </form>
  );
}

export function MemberRow({ member, me }: { member: Profile; me: Profile }) {
  const [rState, rAction] = useActionState(setMemberRole, undefined);
  const [dState, dAction] = useActionState(removeMember, undefined);
  const t = useT();
  const isSelf = member.id === me.id;
  const isOwner = member.role === "owner";
  const iAmOwner = me.role === "owner";
  return (
    <div className="flex items-center gap-2">
      <form action={rAction} className="flex items-center gap-1.5">
        <input type="hidden" name="profile_id" value={member.id} />
        <label className="sr-only" htmlFor={`role-${member.id}`}>{t("settings.roleOf", { name: member.full_name })}</label>
        <select id={`role-${member.id}`} name="role" defaultValue={member.role} className="ctl !w-auto !py-1 text-xs" disabled={isSelf || (isOwner && !iAmOwner)} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="member">{t("role.member")}</option><option value="admin">{t("role.admin")}</option><option value="owner" disabled={!iAmOwner}>{t("role.owner")}</option>
        </select>
      </form>
      {!isSelf && !isOwner && (
        <form action={dAction}>
          <input type="hidden" name="profile_id" value={member.id} />
          <button type="submit" className="text-xs t-muted hover:text-coral-deep font-semibold" onClick={(e) => !confirm(t("settings.confirmRemove", { name: member.full_name })) && e.preventDefault()}>{t("settings.removeMember")}</button>
        </form>
      )}
      {(rState?.error || dState?.error) && <span className="text-xs text-coral-deep" role="alert">{rState?.error ?? dState?.error}</span>}
    </div>
  );
}
