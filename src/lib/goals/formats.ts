import type { IconName } from "@/components/icons";
import { ICONS } from "@/components/icons";
import type { Tone } from "@/lib/status";
import type { Goal, GoalFormat, GoalTrack, GoalType } from "@/lib/types";

export const FORMATS: GoalFormat[] = ["achievement", "numeric_target", "habit", "improvement", "project"];

/** Icoon en kleur per doelvorm; labels via t(`goalFormat.${format}.name`). */
export const FORMAT_META: Record<GoalFormat, { icon: IconName; tone: Tone }> = {
  achievement: { icon: "flag", tone: "coral" },
  numeric_target: { icon: "goal", tone: "blue" },
  habit: { icon: "repeat", tone: "mint" },
  improvement: { icon: "trend", tone: "purple" },
  project: { icon: "project", tone: "yellow" },
};

/** Vorm van een doel; vangt oude afvink-doelen op die nog de standaardvorm hebben. */
export function effectiveFormat(goal: Pick<Goal, "format" | "measure" | "start_value" | "target_value">): GoalFormat {
  if (goal.measure === "binary" && goal.format === "numeric_target") return "achievement";
  if (goal.format === "numeric_target" && goal.target_value < goal.start_value) return "improvement";
  return goal.format ?? "numeric_target";
}

export function goalVisual(goal: Pick<Goal, "format" | "details" | "measure" | "start_value" | "target_value">): { name: IconName; tone: Tone } {
  const meta = FORMAT_META[effectiveFormat(goal)] ?? FORMAT_META.numeric_target;
  const custom = goal.details?.icon;
  return { name: custom && custom in ICONS ? (custom as IconName) : meta.icon, tone: meta.tone };
}

/** Voortgangsmethode; oude doelen zonder details vallen terug op de meetsoort. */
export function goalTrack(goal: Pick<Goal, "measure" | "details">): GoalTrack {
  return goal.details?.track ?? (goal.measure === "binary" ? "done" : "value");
}

/** Categorieën per context; labels via t(`goalCat.${key}`). */
export const PERSONAL_CATEGORIES = ["sport", "learning", "wellbeing", "money", "creativity", "relationships", "growth", "other"] as const;
export const BUSINESS_CATEGORIES = ["revenue", "marketing", "sales", "operations", "product", "customers", "team", "finance", "other"] as const;
export type CategoryKey = (typeof PERSONAL_CATEGORIES)[number] | (typeof BUSINESS_CATEGORIES)[number];

export function categoriesFor(scope: GoalType): readonly CategoryKey[] {
  return scope === "personal" ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES;
}
