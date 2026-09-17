"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, Share2, Sparkles, Users, X } from "lucide-react";
import { saveGoalDraft } from "@/app/actions/goals";
import { ActionForm } from "@/components/ui/form";
import { Avatar, Button, Field, FormMessage, SubmitButton } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { GoalPreview } from "./goal-preview";
import { AchievementFields, HabitFields, ImprovementFields, NumericFields, ProjectFields } from "./wizard-success";
import { MilestoneStep } from "./wizard-milestones";
import { FORMATS, FORMAT_META, categoriesFor } from "@/lib/goals/formats";
import { suggestFromTitle } from "@/lib/goals/suggest";
import { STEP_COUNT, applySuggestion, effectiveDeadline, habitTarget, mapDraft, parseNumber, summarize, validateStep, type Draft } from "@/lib/goals/draft";
import { FREQUENCIES } from "@/lib/periods";
import { fmtDate, fmtValue } from "@/lib/format";
import type { Goal, GoalType, Profile, Team, Visibility } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/client";

export type SetDraft = (patch: Partial<Draft>) => void;
const DRAFT_KEY = "orbit.goalDraft";

export function GoalWizard({ mode, goalId, initial, members, teams, goals, me, isAdmin, myTeamIds }: { mode: "create" | "edit"; goalId?: string; initial: Draft; members: Profile[]; teams: Team[]; goals: Goal[]; me: Profile; isAdmin: boolean; myTeamIds: string[] }) {
  const t = useT();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [state, action, isPending] = useActionState(saveGoalDraft, undefined);
  const [draft, setDraftState] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState("");
  const [seenState, setSeenState] = useState(state);
  // Serverfout: spring naar de stap waar het misging (render-time state-aanpassing, geen effect).
  if (state !== seenState) {
    setSeenState(state);
    const s = Number(state?.data?.step);
    if (state?.error && Number.isInteger(s)) setStep(s);
  }

  const set: SetDraft = (patch) => { setDraftState((d) => ({ ...d, ...patch })); setError(null); };
  const editing = mode === "edit";

  // Concept bewaren in deze browsertab, zodat een per ongeluk herladen of wegklikken niets kost.
  useEffect(() => {
    if (editing) return;
    const id = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { draft?: Partial<Draft>; step?: number };
        if (saved.draft?.title) { setDraftState((d) => ({ ...d, ...saved.draft, ownerId: d.ownerId, routine: { ...d.routine, ...(saved.draft?.routine ?? {}) } })); setStep(Math.min(STEP_COUNT - 1, Math.max(0, saved.step ?? 0))); }
      } catch { /* geen opslag beschikbaar: gewoon leeg beginnen */ }
    }, 0);
    return () => window.clearTimeout(id);
  }, [editing]);
  useEffect(() => {
    if (editing) return;
    try { if (draft.title.trim()) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step })); } catch { /* negeren */ }
  }, [draft, step, editing]);
  const suggestion = useMemo(() => suggestFromTitle(draft.title, t), [draft.title, t]);
  const suggestionKey = suggestion ? `${suggestion.format}:${draft.title.trim().toLowerCase()}` : "";
  const showSuggestion = !editing && !!suggestion && dismissed !== suggestionKey;
  const myTeams = teams.filter((tm) => isAdmin || myTeamIds.includes(tm.id));
  const teamName = teams.find((tm) => tm.id === draft.teamId)?.name;
  const lines = summarize(t, locale, draft, { teamName, shareNames: draft.shares.map((id) => members.find((m) => m.id === id)?.full_name ?? "").filter(Boolean), editing });
  const mapped = useMemo(() => (draft.format ? mapDraft(draft, { stepsUnit: t("wizard.stepsUnit"), defaultCategory: t("goalCat.other") }) : null), [draft, t]);
  const stepNames = [t("wizard.steps.what"), t("wizard.steps.success"), draft.format === "project" ? t("wizard.steps.stepsProject") : t("wizard.steps.milestones"), t("wizard.steps.who"), t("wizard.steps.review")];

  function next() {
    const key = validateStep(draft, step);
    if (key) { setError(t(key)); return; }
    setError(null);
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }
  function acceptSuggestion() {
    if (!suggestion) return;
    const label = suggestion.category ? t(`goalCat.${suggestion.category}`) : null;
    setDraftState((d) => applySuggestion(d, suggestion, label));
    setDismissed(suggestionKey);
    setError(null);
  }
  function setScope(scope: GoalType) {
    const visibility: Visibility = scope === "company" ? "company" : scope === "team" ? "team" : "private";
    set({ scope, visibility, teamId: scope === "team" ? draft.teamId || myTeams[0]?.id || "" : "", category: "" });
  }

  const suggestionBits = suggestion ? [
    t(`goalFormat.${suggestion.format}.name`),
    suggestion.category ? t(`goalCat.${suggestion.category}`) : "",
    suggestion.quantity && suggestion.format === "achievement" ? fmtValue(suggestion.quantity, suggestion.unit ?? "") : "",
    suggestion.habit ? t("wizard.suggest.habitBit", { times: suggestion.habit.times, period: t(`wizard.per.${suggestion.habit.period}`) }) : "",
    suggestion.eventDate ? fmtDate(suggestion.eventDate, "d MMM yyyy", locale) : "",
    suggestion.milestones?.length ? t("wizard.suggest.milestoneBit", { n: suggestion.milestones.length }) : "",
    suggestion.routine ? t("wizard.suggest.routineBit", { times: suggestion.routine.times }) : "",
  ].filter(Boolean) : [];

  const visOptions: { v: Visibility; icon: typeof Lock; title: string; body: string; disabled?: boolean }[] = [
    { v: "private", icon: Lock, title: t("wizard.vis.private"), body: t("wizard.vis.privateBody") },
    { v: "shared", icon: Share2, title: t("wizard.vis.shared"), body: t("wizard.vis.sharedBody"), disabled: members.length <= 1 },
    { v: "team", icon: Users, title: t("wizard.vis.team"), body: myTeams.length ? t("wizard.vis.teamBody") : t("wizard.vis.noTeam"), disabled: myTeams.length === 0 },
  ];
  const cats = categoriesFor(draft.scope).map((k) => t(`goalCat.${k}`));
  const customCat = draft.category !== "" && !cats.includes(draft.category);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <div className="card p-5 sm:p-8 min-w-0">
        <ol className="flex flex-wrap items-center gap-1.5 mb-6" aria-label={t("wizard.progress")}>
          {stepNames.map((name, i) => (
            <li key={name}>
              <button type="button" disabled={i > step} onClick={() => { setError(null); setStep(i); }} aria-current={i === step ? "step" : undefined}
                className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${i === step ? "bg-blue text-white" : i < step ? "bg-sky text-blue-deep" : "bg-cloud text-ink-3"}`}>
                <span className="tnum">{i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}</span><span className={i === step ? "" : "hidden sm:inline"}>{name}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section aria-labelledby="wz-what">
            <h2 id="wz-what" className="text-2xl sm:text-3xl">{t("wizard.whatTitle")}</h2>
            <p className="t-muted mt-1 mb-4">{t("wizard.whatSub")}</p>
            <label htmlFor="wz-title" className="sr-only">{t("wizard.whatTitle")}</label>
            <input id="wz-title" data-tour="wizard-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} className="ctl ctl-lg w-full" placeholder={t("wizard.whatPlaceholder")} maxLength={160} autoFocus={!editing} autoComplete="off" />

            {showSuggestion && suggestion && (
              <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 tile soft-sky p-4 flex flex-wrap items-center gap-3" role="status">
                <Sparkles className="size-5 text-blue-deep shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t("wizard.suggest.title")}</p>
                  <p className="text-sm text-ink-2">{suggestionBits.join(" · ")}</p>
                  <p className="text-xs t-muted mt-0.5">{t("wizard.suggest.note")}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={acceptSuggestion}>{t("wizard.suggest.accept")}</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setDismissed(suggestionKey)} aria-label={t("wizard.suggest.dismiss")}><X className="size-4" aria-hidden /></Button>
                </div>
              </motion.div>
            )}

            <h3 className="text-lg mt-7 mb-3">{t("wizard.formatTitle")}</h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label={t("wizard.formatTitle")} data-tour="wizard-formats">
              {FORMATS.map((f) => {
                const selected = draft.format === f;
                const meta = FORMAT_META[f];
                return (
                  <motion.button key={f} type="button" role="radio" aria-checked={selected} onClick={() => set({ format: f })}
                    animate={reduce ? undefined : { scale: selected ? 1.02 : 1 }} whileTap={reduce ? undefined : { scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className={`text-left rounded-3xl border-2 p-4 flex flex-col gap-2 bg-white ${selected ? "border-blue shadow-[var(--shadow-card)]" : "border-line hover:border-ink-3"}`}>
                    <span className="flex items-center justify-between gap-2">
                      <ClayIcon name={meta.icon} tone={meta.tone} size="md" />
                      {showSuggestion && suggestion?.format === f && !selected && <span className="text-[0.6875rem] font-bold rounded-full bg-sky text-blue-deep px-2 py-0.5">{t("wizard.suggest.badge")}</span>}
                      {selected && <span className="grid place-items-center size-6 rounded-full bg-blue text-white"><Check className="size-3.5" aria-hidden /></span>}
                    </span>
                    <span className="font-display font-extrabold">{t(`goalFormat.${f}.name`)}</span>
                    <span className="text-sm text-ink-2">{t(`goalFormat.${f}.body`)}</span>
                    <span className="text-xs t-muted">{t(`goalFormat.${f}.examples`)}</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {step === 1 && draft.format && (
          <section aria-labelledby="wz-success">
            <h2 id="wz-success" className="text-2xl sm:text-3xl">{t("wizard.successTitle")}</h2>
            <p className="t-muted mt-1 mb-5">{t(`goalFormat.${draft.format}.successSub`)}</p>
            {draft.format === "achievement" && <AchievementFields draft={draft} set={set} />}
            {draft.format === "numeric_target" && <NumericFields draft={draft} set={set} />}
            {draft.format === "habit" && <HabitFields draft={draft} set={set} total={habitTarget(draft)} endDate={fmtDate(effectiveDeadline(draft), "d MMMM yyyy", locale)} />}
            {draft.format === "improvement" && <ImprovementFields draft={draft} set={set} />}
            {draft.format === "project" && <ProjectFields draft={draft} set={set} />}
          </section>
        )}

        {step === 2 && draft.format && <MilestoneStep draft={draft} set={set} editing={editing} goalId={goalId} suggestion={suggestion} target={mapped?.goal.target_value ?? null} />}

        {step === 3 && (
          <section aria-labelledby="wz-who">
            <h2 id="wz-who" className="text-2xl sm:text-3xl">{t("wizard.whoTitle")}</h2>
            <p className="t-muted mt-1 mb-5">{t("wizard.whoSub")}</p>

            {isAdmin && (
              <div className="mb-5">
                <p className="text-sm font-semibold mb-2">{t("wizard.scopeLabel")}</p>
                <div className="inline-flex p-1 gap-1 rounded-full bg-cloud" role="radiogroup" aria-label={t("wizard.scopeLabel")}>
                  {(["personal", "team", "company"] as const).map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={draft.scope === s} onClick={() => setScope(s)} className={`press px-4 py-2 text-sm font-semibold rounded-full ${draft.scope === s ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>{t(`goalType.${s}`)}</button>
                  ))}
                </div>
              </div>
            )}

            {draft.scope === "personal" && (
              <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label={t("wizard.whoTitle")}>
                {visOptions.map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={draft.visibility === o.v} disabled={o.disabled} onClick={() => set({ visibility: o.v, teamId: o.v === "team" ? draft.teamId || myTeams[0]?.id || "" : "" })}
                    className={`press text-left rounded-3xl border-2 p-4 bg-white disabled:opacity-50 disabled:cursor-not-allowed ${draft.visibility === o.v ? "border-blue shadow-[var(--shadow-card)]" : "border-line hover:border-ink-3"}`}>
                    <o.icon className="size-5 text-blue-deep mb-2" aria-hidden />
                    <span className="block font-display font-extrabold">{o.title}</span>
                    <span className="block text-sm text-ink-2 mt-0.5">{o.body}</span>
                  </button>
                ))}
              </div>
            )}
            {draft.scope === "personal" && draft.visibility === "private" && <p className="text-xs t-muted mt-3 inline-flex items-center gap-1.5"><Lock className="size-3.5" aria-hidden /> {t("wizard.vis.privateNote")}</p>}
            {draft.scope === "company" && <p className="tile soft-butter p-4 text-sm">{t("wizard.vis.companyNote")}</p>}

            {draft.visibility === "shared" && draft.scope === "personal" && (
              <div className="mt-4"><PersonChips label={t("wizard.shareWith")} members={members.filter((m) => m.id !== me.id)} selected={draft.shares} onChange={(shares) => set({ shares })} /></div>
            )}
            {((draft.scope === "personal" && draft.visibility === "team") || draft.scope === "team") && (
              <Field label={t("common.team")} htmlFor="wz-team" required className="mt-4 max-w-sm">
                <select id="wz-team" className="ctl" value={draft.teamId} onChange={(e) => set({ teamId: e.target.value })}>
                  <option value="">{t("wizard.chooseTeam")}</option>
                  {myTeams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </select>
              </Field>
            )}
            {draft.scope === "team" && (
              <div className="mt-4 inline-flex p-1 gap-1 rounded-full bg-cloud" role="radiogroup" aria-label={t("goalForm.visibility")}>
                {(["team", "company"] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={draft.visibility === v} onClick={() => set({ visibility: v })} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full ${draft.visibility === v ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2"}`}>{v === "team" ? t("wizard.vis.teamOnly") : t("wizard.vis.wholeCompany")}</button>
                ))}
              </div>
            )}

            {draft.scope !== "personal" && (
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <Field label={t("goalForm.owner")} htmlFor="wz-owner" required>
                  <select id="wz-owner" className="ctl" value={draft.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
                </Field>
                <Field label={t("goalForm.parent")} htmlFor="wz-parent" hint={t("goalForm.parentHint")}>
                  <select id="wz-parent" className="ctl" value={draft.parentId} onChange={(e) => set({ parentId: e.target.value })}>
                    <option value="">{t("common.none")}</option>
                    {goals.filter((g) => g.id !== goalId && g.goal_type !== "personal").map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2"><PersonChips label={t("wizard.contributors")} hint={t("goalForm.responsibleHint")} members={members} selected={draft.assignees} onChange={(assignees) => set({ assignees })} /></div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm font-semibold mb-2">{t("common.category")}</p>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button key={c} type="button" aria-pressed={draft.category === c} onClick={() => set({ category: draft.category === c ? "" : c })} className={`press rounded-full px-3.5 py-1.5 text-sm font-semibold border ${draft.category === c ? "bg-blue text-white border-transparent" : "bg-white border-line text-ink-2 hover:text-ink"}`}>{c}</button>
                ))}
              </div>
              <input aria-label={t("wizard.customCategory")} value={customCat ? draft.category : ""} onChange={(e) => set({ category: e.target.value })} className="ctl mt-2 max-w-sm" placeholder={t("wizard.customCategory")} maxLength={40} />
            </div>

            <details className="mt-6 tile soft-cloud p-4">
              <summary className="cursor-pointer font-semibold text-sm">{t("wizard.moreOptions")}</summary>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label={t("common.description")} htmlFor="wz-desc" className="sm:col-span-2" hint={t("wizard.descHint")}><textarea id="wz-desc" value={draft.description} onChange={(e) => set({ description: e.target.value })} className="ctl !min-h-20" maxLength={1000} /></Field>
                <Field label={t("goalForm.start")} htmlFor="wz-start"><input id="wz-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} className="ctl" /></Field>
                {draft.scope !== "personal" && draft.format !== "numeric_target" && draft.format !== "habit" && (
                  <Field label={t("wizard.reportFreq")} htmlFor="wz-freq"><select id="wz-freq" className="ctl" value={draft.frequency} onChange={(e) => set({ frequency: e.target.value as Draft["frequency"] })}>{FREQUENCIES.map((k) => <option key={k} value={k}>{t(`freq.${k}`)}</option>)}</select></Field>
                )}
                {isAdmin && draft.scope === "personal" && (
                  <Field label={t("goalForm.owner")} htmlFor="wz-owner-p" hint={t("wizard.ownerHint")}><select id="wz-owner-p" className="ctl" value={draft.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>
                )}
                {isAdmin && draft.scope !== "personal" && (
                  <label className="inline-flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.featured} onChange={(e) => set({ featured: e.target.checked })} className="accent-[#5B6CFF] size-4" /> {t("goalForm.featured")}</label>
                )}
              </div>
            </details>
          </section>
        )}

        {step === 4 && mapped && (
          <section aria-labelledby="wz-review">
            <h2 id="wz-review" className="text-2xl sm:text-3xl">{editing ? t("wizard.reviewTitleEdit") : t("wizard.reviewTitle")}</h2>
            <p className="t-muted mt-1 mb-5">{t("wizard.reviewSub")}</p>
            <div className="tile soft-mint p-5">
              <ul className="flex flex-col gap-1.5">{lines.map((l, i) => <li key={i} className={i === 0 ? "font-display font-extrabold text-lg" : "text-ink-2"}>{l}</li>)}</ul>
            </div>
            <dl className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="t-muted">{t("wizard.formatTitle")}</dt><dd className="font-semibold">{t(`goalFormat.${draft.format!}.name`)}</dd>
              <dt className="t-muted">{draft.format === "habit" ? t("wizard.habitEnds") : t("goalForm.deadline")}</dt><dd className="font-semibold">{fmtDate(mapped.goal.deadline, "d MMMM yyyy", locale)}</dd>
              {mapped.goal.measure === "numeric" && <><dt className="t-muted">{t("wizard.measuredAs")}</dt><dd className="font-semibold">{fmtValue(mapped.goal.start_value, mapped.goal.unit)} → {fmtValue(mapped.goal.target_value, mapped.goal.unit)}</dd></>}
              <dt className="t-muted">{t("common.category")}</dt><dd className="font-semibold">{mapped.goal.category}</dd>
              <dt className="t-muted">{t("goalForm.visibility")}</dt><dd className="font-semibold">{t(`visibility.${mapped.goal.visibility}`)}</dd>
            </dl>
            {!editing && mapped.milestones.length > 0 && (
              <ol className="mt-5 flex flex-col gap-1.5">
                {mapped.milestones.map((m, i) => <li key={i} className="flex items-center gap-2.5 text-sm"><span className="grid place-items-center size-6 rounded-full bg-sky text-blue-deep text-xs font-bold tnum">{i + 1}</span><span className="font-medium">{m.name}</span>{m.reward && <span className="text-xs t-muted">· {m.reward}</span>}</li>)}
              </ol>
            )}
          </section>
        )}

        <div className="mt-7 pt-5 border-t border-line flex flex-col gap-3">
          <FormMessage error={error ?? state?.error} />
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}><ArrowLeft className="size-4" aria-hidden /> {t("onboarding.back")}</Button>
            {step < STEP_COUNT - 1 ? (
              <Button type="button" size="lg" onClick={next}>{t("onboarding.next")} <ArrowRight className="size-4" aria-hidden /></Button>
            ) : (
              <ActionForm action={action} pending={isPending} onSubmit={() => { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* negeren */ } }}>
                {goalId && <input type="hidden" name="id" value={goalId} />}
                <input type="hidden" name="payload" value={JSON.stringify(draft)} />
                <SubmitButton size="lg" pendingText={t("common.saving")}>{editing ? t("goalForm.saveChanges") : t("goalForm.create")}</SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24"><GoalPreview draft={draft} lines={lines} target={mapped && !Number.isNaN(mapped.goal.target_value) ? mapped.goal.target_value : parseNumber(draft.quantity) || null} /></aside>
    </div>
  );
}

function PersonChips({ label, hint, members, selected, onChange }: { label: string; hint?: string; members: Profile[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const t = useT();
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-2">{label}</legend>
      {members.length === 0 && <p className="text-xs t-muted">{t("picker.none")}</p>}
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = selected.includes(m.id);
          return (
            <button key={m.id} type="button" aria-pressed={on} onClick={() => onChange(on ? selected.filter((id) => id !== m.id) : [...selected, m.id])} className={`press inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm font-semibold border ${on ? "bg-sky border-blue text-blue-deep" : "bg-white border-line text-ink-2 hover:text-ink"}`}>
              <Avatar name={m.full_name} src={m.avatar_url} size="xs" /> {m.full_name}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-xs t-muted mt-2">{hint}</p>}
    </fieldset>
  );
}
