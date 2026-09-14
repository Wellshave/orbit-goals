"use client";

import { useActionState, useState } from "react";
import { createOrganization, joinWithCode, updateProfile } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { AvatarUploader } from "@/components/people/avatar-uploader";
import type { Profile } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function OrgStep() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [cState, cAction, cPending] = useActionState(createOrganization, undefined);
  const [jState, jAction, jPending] = useActionState(joinWithCode, undefined);
  const t = useT();
  return (
    <div className="card-lift p-6 sm:p-8">
      <h1 className="text-3xl">{t("onboarding.whereTitle")}</h1>
      <p className="t-muted mt-1">{t("onboarding.whereSub")}</p>
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud mt-6" role="tablist">
        {(["create", "join"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full ${mode === m ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>
            {m === "create" ? t("onboarding.newOrg") : t("onboarding.haveInvite")}
          </button>
        ))}
      </div>
      {mode === "create" ? (
        <ActionForm action={cAction} pending={cPending} className="mt-6 flex flex-col gap-4">
          <Field label={t("onboarding.orgName")} htmlFor="name" required hint={t("onboarding.orgHint")}><input id="name" name="name" required className="ctl" placeholder={t("onboarding.orgPlaceholder")} /></Field>
          <FormMessage error={cState?.error} />
          <SubmitButton size="lg" pendingText={t("onboarding.creatingOrg")}>{t("onboarding.createOrg")}</SubmitButton>
        </ActionForm>
      ) : (
        <ActionForm action={jAction} pending={jPending} className="mt-6 flex flex-col gap-4">
          <Field label={t("onboarding.inviteLink")} htmlFor="code" required><input id="code" name="code" required className="ctl" placeholder="https://…/invite/abc123" /></Field>
          <FormMessage error={jState?.error} />
          <SubmitButton size="lg" pendingText={t("common.busy")}>{t("onboarding.join")}</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

export function ProfileStep({ profile, orgName }: { profile: Profile; orgName: string }) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);
  const t = useT();
  return (
    <div className="card-lift p-6 sm:p-8">
      <p className="t-label">{orgName}</p>
      <h1 className="text-3xl mt-1">{t("onboarding.profileTitle")}</h1>
      <p className="t-muted mt-1">{t("onboarding.profileSub")}</p>
      <div className="mt-6"><AvatarUploader profile={profile} /></div>
      <ActionForm action={action} pending={isPending} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value="/dashboard" />
        <Field label={t("auth.fullName")} htmlFor="full_name" required><input id="full_name" name="full_name" required defaultValue={profile.full_name} className="ctl" /></Field>
        <Field label={t("onboarding.jobTitle")} htmlFor="job_title" hint={t("onboarding.jobHint")}><input id="job_title" name="job_title" defaultValue={profile.job_title} className="ctl" /></Field>
        <FormMessage error={state?.error} />
        <SubmitButton size="lg" pendingText={t("common.saving")}>{t("onboarding.saveAndGo")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
