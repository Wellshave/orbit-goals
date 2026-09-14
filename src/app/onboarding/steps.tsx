"use client";

import { useActionState, useState } from "react";
import { createOrganization, joinWithCode, updateProfile } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { AvatarUploader } from "@/components/people/avatar-uploader";
import type { Profile } from "@/lib/types";

export function OrgStep() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [cState, cAction] = useActionState(createOrganization, undefined);
  const [jState, jAction] = useActionState(joinWithCode, undefined);
  return (
    <div className="card-lift p-6 sm:p-8">
      <h1 className="text-3xl">Waar werk je?</h1>
      <p className="t-muted mt-1">Start een nieuwe organisatie, of sluit je aan met een uitnodigingslink.</p>
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud mt-6" role="tablist">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full ${mode === m ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}
          >
            {m === "create" ? "Nieuwe organisatie" : "Ik heb een uitnodiging"}
          </button>
        ))}
      </div>
      {mode === "create" ? (
        <form action={cAction} className="mt-6 flex flex-col gap-4">
          <Field label="Naam van je organisatie" htmlFor="name" required hint="Jij wordt automatisch owner.">
            <input id="name" name="name" required className="ctl" placeholder="Bijv. Wellshave" />
          </Field>
          <FormMessage error={cState?.error} />
          <SubmitButton size="lg" pendingText="Organisatie wordt aangemaakt…">Organisatie aanmaken</SubmitButton>
        </form>
      ) : (
        <form action={jAction} className="mt-6 flex flex-col gap-4">
          <Field label="Uitnodigingslink of -code" htmlFor="code" required>
            <input id="code" name="code" required className="ctl" placeholder="https://…/invite/abc123" />
          </Field>
          <FormMessage error={jState?.error} />
          <SubmitButton size="lg" pendingText="Bezig…">Aansluiten bij organisatie</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function ProfileStep({ profile, orgName }: { profile: Profile; orgName: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <div className="card-lift p-6 sm:p-8">
      <p className="t-label">{orgName}</p>
      <h1 className="text-3xl mt-1">Zo zien collega&apos;s je</h1>
      <p className="t-muted mt-1">Naam, functie en een profielfoto. Je kunt dit later altijd aanpassen.</p>
      <div className="mt-6">
        <AvatarUploader profile={profile} />
      </div>
      <form action={action} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value="/dashboard" />
        <Field label="Volledige naam" htmlFor="full_name" required>
          <input id="full_name" name="full_name" required defaultValue={profile.full_name} className="ctl" />
        </Field>
        <Field label="Functie" htmlFor="job_title" hint="Bijv. Operations Lead, Media Buyer, Founder.">
          <input id="job_title" name="job_title" defaultValue={profile.job_title} className="ctl" />
        </Field>
        <FormMessage error={state?.error} />
        <SubmitButton size="lg" pendingText="Opslaan…">Opslaan en naar mijn dashboard</SubmitButton>
      </form>
    </div>
  );
}
