"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { AvatarUploader } from "./avatar-uploader";
import type { Profile } from "@/lib/types";

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <section className="deck p-5" aria-labelledby="profile-editor">
      <h2 id="profile-editor" className="t-eyebrow mb-4">Mijn profiel</h2>
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <AvatarUploader profile={profile} />
        <form action={action} className="grid sm:grid-cols-2 gap-4">
          <Field label="Naam" htmlFor="pe-name" required><input id="pe-name" name="full_name" required defaultValue={profile.full_name} className="ctl" /></Field>
          <Field label="Functie" htmlFor="pe-title"><input id="pe-title" name="job_title" defaultValue={profile.job_title} className="ctl" /></Field>
          <div className="sm:col-span-2 flex items-center gap-3"><SubmitButton size="sm" pendingText="Opslaan…">Profiel opslaan</SubmitButton><FormMessage error={state?.error} success={state?.success} /></div>
        </form>
      </div>
    </section>
  );
}
