"use client";

import type { Team } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/client";

/** Maand + jaar als twee selects: werkt in elke browser (type="month" niet in Safari). */
export function StartedSelects({ value, idPrefix = "started" }: { value?: string | null; idPrefix?: string }) {
  const t = useT();
  const locale = useLocale();
  const month = value ? Number(value.slice(5, 7)) : 0;
  const year = value ? Number(value.slice(0, 4)) : 0;
  const now = new Date().getFullYear();
  const years = Array.from({ length: now - 1989 }, (_, i) => now - i);
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(locale === "nl" ? "nl-NL" : "en-GB", { month: "long" }));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-month`} className="text-xs font-semibold t-muted">{t("profile.month")}</label>
        <select id={`${idPrefix}-month`} name="started_month" defaultValue={month || ""} className="ctl">
          <option value="">{t("profile.none")}</option>
          {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-year`} className="text-xs font-semibold t-muted">{t("profile.year")}</label>
        <select id={`${idPrefix}-year`} name="started_year" defaultValue={year || ""} className="ctl">
          <option value="">{t("profile.none")}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Teamkeuze als gekleurde chips (checkboxes). Stuurt altijd `teams_form=1` mee zodat "geen team" ook opgeslagen wordt. */
export function TeamPicker({ teams, selected }: { teams: Team[]; selected: string[] }) {
  const t = useT();
  if (teams.length === 0) return <p className="text-sm t-muted"><input type="hidden" name="teams_form" value="1" />{t("onboarding.noTeams")}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="teams_form" value="1" />
      {teams.map((tm) => (
        <label key={tm.id} className="press inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold cursor-pointer has-[:checked]:bg-(--chip) has-[:checked]:text-white has-[:checked]:border-transparent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue" style={{ ["--chip" as string]: tm.color }}>
          <input type="checkbox" name="team_ids" value={tm.id} defaultChecked={selected.includes(tm.id)} className="peer sr-only" />
          <span className="size-2.5 rounded-full bg-(--chip) peer-checked:bg-white" aria-hidden />
          <span>{tm.name}</span>
        </label>
      ))}
    </div>
  );
}

export function FocusField({ value, id = "focus", placeholder }: { value?: string; id?: string; placeholder?: string }) {
  return <textarea id={id} name="focus" defaultValue={value ?? ""} maxLength={400} rows={3} className="ctl !min-h-20" placeholder={placeholder} />;
}
