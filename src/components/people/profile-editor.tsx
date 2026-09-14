"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { AvatarUploader } from "./avatar-uploader";
import { FocusField, StartedSelects, TeamPicker } from "./profile-fields";
import type { Profile, Team } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function ProfileEditor({ profile, teams, teamIds }: { profile: Profile; teams: Team[]; teamIds: string[] }) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);
  const t = useT();
  return (
    <section className="card p-6" aria-labelledby="profile-editor">
      <h2 id="profile-editor" className="text-xl mb-4">{t("profile.title")}</h2>
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <AvatarUploader profile={profile} />
        <ActionForm action={action} pending={isPending} className="grid sm:grid-cols-2 gap-4">
          <Field label={t("profile.name")} htmlFor="pe-name" required><input id="pe-name" name="full_name" required defaultValue={profile.full_name} className="ctl" /></Field>
          <Field label={t("profile.jobTitle")} htmlFor="pe-title"><input id="pe-title" name="job_title" defaultValue={profile.job_title} className="ctl" /></Field>
          <Field label={t("profile.startedAt")} htmlFor="pe-month" hint={t("profile.startedHint")}><StartedSelects value={profile.started_at} idPrefix="pe" /></Field>
          <Field label={t("profile.teams")} hint={t("profile.teamsHint")}><TeamPicker teams={teams} selected={teamIds} /></Field>
          <Field label={t("profile.focus")} htmlFor="pe-focus" hint={t("profile.focusHint")} className="sm:col-span-2"><FocusField value={profile.focus} id="pe-focus" placeholder={t("onboarding.focusPlaceholder")} /></Field>
          <div className="sm:col-span-2 flex items-center gap-3"><SubmitButton size="sm" pendingText={t("common.saving")}>{t("profile.save")}</SubmitButton><FormMessage error={state?.error} success={state?.success} /></div>
        </ActionForm>
      </div>
    </section>
  );
}
