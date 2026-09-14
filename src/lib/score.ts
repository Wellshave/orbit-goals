import type { ContributionKind } from "./types";

/**
 * Puntentabel van het scorebord. Bewust niet gebaseerd op omzet of absolute KPI-waarden,
 * zodat rollen eerlijk vergelijkbaar zijn. De tabel wordt in de database toegepast
 * (triggers in 0003_logic.sql); dit bestand is de leesbare uitleg voor de interface.
 */
export const SCORE_RULES: Record<ContributionKind, { points: number; label: string; explain: string }> = {
  kpi_checkin: { points: 10, label: "KPI-check-in", explain: "Elke ingevulde check-in, ongeacht de waarde." },
  ontime_checkin: { points: 5, label: "Tijdige update", explain: "Check-in binnen twee dagen na het einde van de periode." },
  kpi_target_hit: { points: 25, label: "Target gehaald", explain: "De periode-waarde haalt het KPI-target." },
  streak_bonus: { points: 10, label: "Consistentie", explain: "Drie of meer periodes op rij het target gehaald." },
  goal_update: { points: 5, label: "Voortgangsupdate", explain: "Een voortgangsupdate op een doel met toelichting." },
  milestone_achieved: { points: 40, label: "Milestone behaald", explain: "Voor de eigenaar en verantwoordelijke teamleden van het doel." },
  goal_achieved: { points: 60, label: "Doel behaald", explain: "Het ultimate goal is bereikt." },
  recognition: { points: 15, label: "Erkende bijdrage", explain: "Een goal owner erkende jouw update." },
};

export const SCORE_ORDER: ContributionKind[] = [
  "kpi_target_hit", "kpi_checkin", "ontime_checkin", "streak_bonus", "goal_update", "milestone_achieved", "goal_achieved", "recognition",
];
