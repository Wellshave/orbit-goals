import type { ContributionKind } from "./types";

/**
 * Puntentabel van het scorebord. Bewust niet gebaseerd op omzet of absolute KPI-waarden.
 * De tabel wordt in de database toegepast (triggers in 0003_logic.sql); labels en uitleg
 * staan in de woordenboeken onder `score.<kind>`.
 */
export const SCORE_POINTS: Record<ContributionKind, number> = {
  kpi_checkin: 10, ontime_checkin: 5, kpi_target_hit: 25, streak_bonus: 10, goal_update: 5, milestone_achieved: 40, goal_achieved: 60, recognition: 15,
};

export const SCORE_ORDER: ContributionKind[] = [
  "kpi_target_hit", "kpi_checkin", "ontime_checkin", "streak_bonus", "goal_update", "milestone_achieved", "goal_achieved", "recognition",
];
