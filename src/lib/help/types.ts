export type TourAction = "hover" | "click" | "type";

export interface TourStep {
  /** data-tour attribuut van het element op de pagina */
  target: string;
  /** Engelse uitleg in beeld */
  text: string;
  action?: TourAction;
  /** Bij action 'click': voer de klik echt uit (alleen voor veilige, niet-verzendende elementen) */
  real?: boolean;
  /** Bij action 'type': tekst die visueel wordt ingetypt (wordt daarna weer gewist) */
  typeText?: string;
  /** Extra leestijd in ms */
  hold?: number;
}

export type HelpVisualKind =
  | "dashboard" | "progress-path" | "goal-card" | "status" | "checkin" | "kpi" | "visibility" | "score" | "milestones"
  | "feed" | "period" | "navigation" | "notifications" | "people" | "settings" | "teams" | "company" | "goal-form" | "kpi-form" | "saved-views";

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  visual: HelpVisualKind;
  /** Korte genummerde uitleg */
  steps: string[];
  /** Tips onderaan */
  tips?: string[];
  /** Interactieve walkthrough op de echte pagina */
  tour?: TourStep[];
  /** Pagina waarop de tour thuishoort (voor de help-index) */
  route?: string;
}
