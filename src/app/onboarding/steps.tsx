"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { createOrganization, joinWithCode, updateProfile } from "@/app/actions/org";
import { Field, FormMessage, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import { AvatarUploader } from "@/components/people/avatar-uploader";
import type { Profile, Team } from "@/lib/types";
import { FocusField, StartedSelects, TeamPicker } from "@/components/people/profile-fields";
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

const TOTAL = 5;

/**
 * Kennismaking in vijf vragen. Alle velden blijven gemount (verborgen met `hidden`),
 * zodat één submit alles opslaat; per vraag wordt eerst de invoer gevalideerd.
 */
export function ProfileStep({ profile, orgName, teams, teamIds }: { profile: Profile; orgName: string; teams: Team[]; teamIds: string[] }) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT();

  const fieldsOf = (n: number) => Array.from(formRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-step="${n}"] input, [data-step="${n}"] textarea, [data-step="${n}"] select`) ?? []);
  const next = () => {
    const bad = fieldsOf(step).find((el) => !el.checkValidity());
    if (bad) { bad.reportValidity(); return; }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    for (let n = 0; n < TOTAL; n++) {
      const bad = fieldsOf(n).find((el) => !el.checkValidity());
      if (bad) { e.preventDefault(); setStep(n); setTimeout(() => bad.reportValidity(), 0); return; }
    }
  };
  const last = step === TOTAL - 1;
  const questions = [
    { title: t("onboarding.qName"), sub: t("onboarding.qNameSub") },
    { title: t("onboarding.qJob"), sub: t("onboarding.qJobSub") },
    { title: t("onboarding.qTeams"), sub: t("onboarding.qTeamsSub") },
    { title: t("onboarding.qStarted"), sub: t("onboarding.qStartedSub") },
    { title: t("onboarding.qFocus"), sub: t("onboarding.qFocusSub") },
  ];

  return (
    <div className="card-lift p-6 sm:p-8">
      <p className="t-label">{orgName}</p>
      <h1 className="text-3xl mt-1">{t("onboarding.introTitle")}</h1>
      <p className="t-muted mt-1">{t("onboarding.introSub")}</p>
      <div className="mt-5 flex items-center gap-3" aria-live="polite">
        <span className="text-xs font-semibold t-muted">{t("onboarding.qOf", { n: step + 1, total: TOTAL })}</span>
        <ol className="flex gap-1.5" aria-hidden>
          {questions.map((_, i) => <li key={i} className={`h-1.5 rounded-full transition-[width,background-color] ${i <= step ? "bg-blue w-6" : "bg-cloud w-3"}`} />)}
        </ol>
      </div>
      <ActionForm ref={formRef} action={action} pending={isPending} onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="next" value="/dashboard" />
        <div className="min-h-44">
          <h2 className="text-xl">{questions[step].title}</h2>
          <p className="t-muted text-sm mt-1 mb-4">{questions[step].sub}</p>

          <div data-step="0" hidden={step !== 0} className="flex flex-col gap-4">
            <AvatarUploader profile={profile} />
            <Field label={t("auth.fullName")} htmlFor="full_name" required><input id="full_name" name="full_name" required minLength={2} defaultValue={profile.full_name} className="ctl" autoComplete="name" /></Field>
          </div>
          <div data-step="1" hidden={step !== 1}>
            <Field label={t("onboarding.jobTitle")} htmlFor="job_title" required hint={t("onboarding.jobHint")}><input id="job_title" name="job_title" required minLength={2} defaultValue={profile.job_title} className="ctl" autoComplete="organization-title" /></Field>
          </div>
          <div data-step="2" hidden={step !== 2}>
            <TeamPicker teams={teams} selected={teamIds} />
          </div>
          <div data-step="3" hidden={step !== 3}>
            <StartedSelects value={profile.started_at} idPrefix="ob" />
          </div>
          <div data-step="4" hidden={step !== 4}>
            <Field label={t("profile.focus")} htmlFor="focus"><FocusField value={profile.focus} placeholder={t("onboarding.focusPlaceholder")} /></Field>
          </div>
        </div>
        <FormMessage error={state?.error} />
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="press text-sm font-semibold text-ink-2 hover:text-ink disabled:opacity-40 px-2 py-2">{t("onboarding.back")}</button>
          {last ? (
            <SubmitButton size="lg" pendingText={t("common.saving")}>{t("onboarding.finish")}</SubmitButton>
          ) : (
            <button type="button" onClick={next} className="press inline-flex items-center justify-center rounded-full bg-blue text-white font-semibold px-6 py-3 shadow-[var(--shadow-press)] hover:bg-blue-deep">{t("onboarding.next")}</button>
          )}
        </div>
      </ActionForm>
    </div>
  );
}
