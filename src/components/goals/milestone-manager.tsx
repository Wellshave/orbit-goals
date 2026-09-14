"use client";

import { useActionState, useState } from "react";
import { Gift, Pencil, Plus, Star, Check, Trash2 } from "lucide-react";
import { saveMilestone, deleteMilestone, grantReward } from "@/app/actions/goals";
import { Button, Field, FormMessage, Modal, SubmitButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/form";
import type { Goal, Milestone, Reward } from "@/lib/types";
import { fmtDate, fmtValue } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
const REWARD_KINDS = ["team_outing", "bonus", "day_off", "dinner", "personal", "other"] as const;

export function MilestoneManager({ goal, milestones, rewards, canManage }: { goal: Goal; milestones: Milestone[]; rewards: Reward[]; canManage: boolean }) {
  const [editing, setEditing] = useState<Milestone | null | "new">(null);
  const t = useT();
  const locale = useLocale();
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order || a.target_value - b.target_value);
  return (
    <div>
      <ol className="flex flex-col divide-y divide-line">
        {sorted.map((m) => {
          const reward = rewards.find((r) => r.milestone_id === m.id);
          const done = m.status === "achieved";
          return (
            <li key={m.id} className="py-3 flex items-start gap-3">
              <span className={`clay mt-0.5 size-9 shrink-0 ${done ? "bg-mint text-white" : m.is_ultimate ? "bg-butter text-yellow-deep" : "bg-cloud text-ink-2"}`} aria-hidden>
                {done ? <Check className="size-3.5" /> : m.is_ultimate ? <Star className="size-3.5" /> : <span className="text-xs font-bold">{m.sort_order}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm flex flex-wrap items-center gap-x-2">
                  {m.name}
                  <span className="t-muted font-medium">{fmtValue(m.target_value, goal.unit)}</span>
                  {m.is_ultimate && <span className="text-xs font-semibold text-yellow-deep bg-butter rounded-full px-2">{t("milestones.final")}</span>}
                </p>
                <p className="text-xs t-muted mt-0.5">
                  {done ? t("milestones.achievedOn", { d: fmtDate(m.achieved_at, "d MMM yyyy", locale) }) : m.target_date ? t("milestones.targetDate", { d: fmtDate(m.target_date, "d MMM yyyy", locale) }) : t("milestones.noDate")}
                  {m.description ? ` · ${m.description}` : ""}
                </p>
                {reward && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${reward.granted_at ? "text-mint-deep" : "text-yellow-deep"}`}>
                      <Gift className="size-3.5" aria-hidden /> {reward.title}
                      <span className="t-muted font-normal">· {t(`rewardKind.${reward.kind}`)}</span>
                      {reward.granted_at && <span className="t-muted font-normal">{t("milestones.granted", { d: fmtDate(reward.granted_at, "d MMM yyyy", locale) })}</span>}
                    </span>
                    {canManage && done && (
                      <form action={grantReward}>
                        <input type="hidden" name="id" value={reward.id} />
                        <input type="hidden" name="goal_id" value={goal.id} />
                        {reward.granted_at && <input type="hidden" name="undo" value="1" />}
                        <button type="submit" className="text-blue-deep font-semibold hover:underline">{reward.granted_at ? t("milestones.undoGrant") : t("milestones.grant")}</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setEditing(m)} className="press p-2 rounded-full text-ink-2 hover:text-ink hover:bg-cloud" aria-label={t("milestones.editAria", { m: m.name })}>
                    <Pencil className="size-4" />
                  </button>
                  <form action={deleteMilestone}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="goal_id" value={goal.id} />
                    <button type="submit" className="press p-2 rounded-full text-ink-2 hover:text-coral-deep hover:bg-cloud" aria-label={t("milestones.deleteAria", { m: m.name })} onClick={(e) => !confirm(t("milestones.confirmDelete", { m: m.name })) && e.preventDefault()}>
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {sorted.length === 0 && <p className="text-sm t-muted py-2">{t("milestones.none")}{canManage ? t("milestones.noneManage") : ""}</p>}
      {canManage && (
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> {t("milestones.add")}
        </Button>
      )}
      {editing && (
        <MilestoneModal goal={goal} milestone={editing === "new" ? null : editing} reward={editing === "new" ? undefined : rewards.find((r) => r.milestone_id === editing.id)} nextOrder={sorted.length + 1} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function MilestoneModal({ goal, milestone, reward, nextOrder, onClose }: { goal: Goal; milestone: Milestone | null; reward?: Reward; nextOrder: number; onClose: () => void }) {
  const t = useT();
  const [state, action, isPending] = useActionState(async (prev: Awaited<ReturnType<typeof saveMilestone>>, fd: FormData) => {
    const result = await saveMilestone(prev, fd);
    if (result?.success) onClose();
    return result;
  }, undefined);
  return (
    <Modal open onClose={onClose} title={milestone ? t("milestones.edit") : t("milestones.newTitle")} help="milestones">
      <ActionForm action={action} pending={isPending} className="flex flex-col gap-4">
        <input type="hidden" name="goal_id" value={goal.id} />
        {milestone && <input type="hidden" name="id" value={milestone.id} />}
        <input type="hidden" name="sort_order" value={milestone?.sort_order ?? nextOrder} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("milestones.name")} htmlFor="ms-name" required>
            <input id="ms-name" name="name" required defaultValue={milestone?.name} className="ctl" placeholder={t("milestones.namePlaceholder")} />
          </Field>
          <Field label={t("milestones.targetValue", { u: goal.unit || t("milestones.count") })} htmlFor="ms-target" required>
            <input id="ms-target" name="target_value" inputMode="decimal" required defaultValue={milestone?.target_value ?? (goal.measure === "binary" ? 1 : "")} className="ctl tnum" disabled={goal.measure === "binary"} />
          </Field>
          <Field label={t("milestones.date")} htmlFor="ms-date">
            <input id="ms-date" name="target_date" type="date" defaultValue={milestone?.target_date ?? ""} className="ctl" />
          </Field>
          <Field label={t("milestones.description")} htmlFor="ms-desc">
            <input id="ms-desc" name="description" defaultValue={milestone?.description} className="ctl" />
          </Field>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_ultimate" defaultChecked={milestone?.is_ultimate} className="accent-[#9B72F2] size-4" /> {t("milestones.isUltimate")}
        </label>
        <fieldset className="tile soft-butter p-3">
          <legend className="t-label px-1">{t("milestones.reward")}</legend>
          <div className="grid sm:grid-cols-2 gap-3 mt-1">
            <Field label={t("milestones.reward")} htmlFor="rw-title" hint={t("milestones.rewardHint")}>
              <input id="rw-title" name="reward_title" defaultValue={reward?.title} className="ctl" placeholder={t("milestones.rewardPlaceholder")} />
            </Field>
            <Field label={t("milestones.kind")} htmlFor="rw-kind">
              <select id="rw-kind" name="reward_kind" className="ctl" defaultValue={reward?.kind ?? "other"}>
                {REWARD_KINDS.map((k) => (
                  <option key={k} value={k}>{t(`rewardKind.${k}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("milestones.rewardDesc")} htmlFor="rw-desc" className="sm:col-span-2">
              <input id="rw-desc" name="reward_description" defaultValue={reward?.description} className="ctl" />
            </Field>
          </div>
        </fieldset>
        <FormMessage error={state?.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <SubmitButton pendingText={t("common.saving")}>{milestone ? t("milestones.save") : t("milestones.addBtn")}</SubmitButton>
        </div>
      </ActionForm>
    </Modal>
  );
}
