-- 0004: hardening n.a.v. de Supabase security advisor.
-- Vaste search_path voor alle functies zonder security definer.
alter function set_updated_at() set search_path = public;
alter function goal_progress(goals) set search_path = public;
alter function goal_expected_progress(goals, date) set search_path = public;
alter function compute_goal_status(goals) set search_path = public;
alter function goals_before_write() set search_path = public;
alter function milestone_reached(goals, milestones, numeric) set search_path = public;
alter function milestones_before_write() set search_path = public;
alter function kpi_target_hit(kpis, numeric) set search_path = public;
alter function kpi_ratio(kpis, numeric) set search_path = public;
alter function kpi_status_for(kpis, numeric) set search_path = public;

-- Geen enkele functie voor anonieme bezoekers, behalve het inzien van een uitnodiging (token-gated).
revoke execute on all functions in schema public from public, anon;
grant execute on function get_invitation(text) to anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- Triggerfuncties zijn nooit bedoeld als RPC.
revoke execute on function handle_new_user() from authenticated;
revoke execute on function guard_profile_changes() from authenticated;
revoke execute on function goals_after_write() from authenticated;
revoke execute on function goals_before_write() from authenticated;
revoke execute on function goal_updates_after_insert() from authenticated;
revoke execute on function goal_assignments_after_insert() from authenticated;
revoke execute on function milestones_before_write() from authenticated;
revoke execute on function kpi_checkins_after_write() from authenticated;
revoke execute on function kpi_assignments_after_insert() from authenticated;
revoke execute on function comments_after_insert() from authenticated;
revoke execute on function mentions_after_insert() from authenticated;
revoke execute on function recognitions_after_insert() from authenticated;
revoke execute on function recognitions_after_delete() from authenticated;
revoke execute on function set_updated_at() from authenticated;
