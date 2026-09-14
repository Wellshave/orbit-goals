export type OrgRole = "owner" | "admin" | "member";
export type GoalType = "personal" | "team" | "company";
export type Visibility = "private" | "shared" | "team" | "company";
export type Status = "not_started" | "on_track" | "needs_attention" | "behind" | "achieved";
export type Measure = "numeric" | "binary";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type KpiScope = "personal" | "team" | "company";
export type KpiDirection = "higher_better" | "lower_better";
export type ContributionKind =
  | "kpi_checkin" | "kpi_target_hit" | "ontime_checkin" | "goal_update"
  | "milestone_achieved" | "recognition" | "goal_achieved" | "streak_bonus";
export type NotificationKind =
  | "mention" | "reply" | "kpi_assigned" | "deadline_soon" | "milestone_near"
  | "milestone_achieved" | "goal_behind" | "recognition" | "goal_assigned" | "invite";

export interface Organization { id: string; name: string; slug: string; product_name: string; }

export interface Profile {
  id: string; org_id: string | null; email: string; full_name: string; job_title: string;
  avatar_url: string | null; role: OrgRole; onboarded: boolean; created_at: string; locale?: "nl" | "en";
  started_at?: string | null; focus?: string;
}

export interface Team { id: string; org_id: string; name: string; description: string; color: string; }
export interface TeamMembership { team_id: string; profile_id: string; is_lead: boolean; }

export interface Goal {
  id: string; org_id: string; title: string; description: string; goal_type: GoalType;
  owner_id: string; team_id: string | null; parent_goal_id: string | null;
  start_date: string; deadline: string; measure: Measure; unit: string;
  start_value: number; target_value: number; current_value: number;
  frequency: Frequency; visibility: Visibility; status: Status; category: string;
  is_featured: boolean; created_by: string | null; created_at: string; updated_at: string; achieved_at: string | null;
}

export interface GoalAssignment { goal_id: string; profile_id: string; is_responsible: boolean; }
export interface GoalShare { goal_id: string; profile_id: string; can_edit: boolean; }
export interface GoalUpdate {
  id: string; goal_id: string; profile_id: string; previous_value: number; new_value: number; note: string; created_at: string;
}
export interface Milestone {
  id: string; goal_id: string; name: string; description: string; target_value: number; target_date: string | null;
  is_ultimate: boolean; status: "pending" | "achieved"; achieved_at: string | null; sort_order: number;
}
export interface Reward {
  id: string; milestone_id: string; title: string; kind: "team_outing" | "bonus" | "day_off" | "dinner" | "personal" | "other";
  description: string; granted_at: string | null;
}

export interface Kpi {
  id: string; org_id: string; name: string; description: string; category: string; scope: KpiScope;
  owner_id: string | null; team_id: string | null; frequency: Frequency; direction: KpiDirection;
  target_value: number; current_value: number | null; unit: string; period_start: string; period_end: string | null;
  status: Status; source_note: string; created_by: string | null; created_at: string;
}
export interface KpiAssignment { kpi_id: string; profile_id: string; }
export interface KpiCheckin {
  id: string; kpi_id: string; profile_id: string; period_start: string; period_end: string; value: number; note: string; created_at: string;
}

export interface Comment {
  id: string; org_id: string; goal_id: string; goal_update_id: string | null; parent_comment_id: string | null;
  author_id: string; body: string; created_at: string;
}
export interface Reaction { comment_id: string; profile_id: string; kind: "like" | "ack"; }
export interface Recognition { goal_update_id: string; recognized_by: string; created_at: string; }

export interface Notification {
  id: string; recipient_id: string; actor_id: string | null; kind: NotificationKind; title: string; body: string;
  href: string; read_at: string | null; created_at: string;
}

export interface Contribution {
  id: string; profile_id: string; team_id: string | null; kind: ContributionKind; points: number;
  ref_table: string | null; ref_id: string | null; note: string; occurred_at: string;
}

export interface SavedFilter { id: string; profile_id: string; name: string; route: string; query: string; }

export interface ActivityEvent {
  id: string; actor_id: string | null; goal_id: string | null; kpi_id: string | null;
  kind: "goal_created" | "goal_update" | "milestone_achieved" | "comment" | "status_change" | "kpi_checkin" | "assignment" | "goal_achieved";
  payload: Record<string, unknown>; created_at: string;
}

export interface Kudos { id: string; org_id: string; from_id: string; to_id: string; kind: "high_five" | "thanks" | "celebrate"; message: string; goal_id: string | null; created_at: string; }
