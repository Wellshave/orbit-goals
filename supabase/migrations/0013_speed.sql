-- Snelheid: minder round trips per pagina, herinneringen van het renderpad af, goedkopere RLS.
--
-- 1. orbit_bootstrap(): profiel, organisatie, ongelezen-tellers en de ledenlijst met teams in één
--    verzoek. Draait met de rechten van de aanroeper, dus RLS blijft precies zo gelden.
-- 2. Herinneringen (deadline nadert / milestone in zicht) werden bij élke paginaweergave berekend.
--    Dat doet nu pg_cron elke 5 minuten voor alle organisaties.
-- 3. RLS: auth.uid(), my_org_id() en is_admin() in (select …) zodat Postgres ze één keer per query
--    uitrekent in plaats van per rij. Alleen Orbit-tabellen; de pl_-tabellen blijven ongemoeid.
-- 4. Indexen op foreign keys zonder index, plus een gedeeltelijke index voor ongelezen meldingen.

-- 1. Alles wat elke pagina nodig heeft, in één keer --------------------------------------------

create or replace function public.orbit_bootstrap()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select p.* from profiles p where p.id = (select auth.uid())
  )
  select jsonb_build_object(
    'profile', (select to_jsonb(me) from me),
    'org', (select to_jsonb(o) from organizations o where o.id = (select org_id from me)),
    'unread', (select count(*) from notifications n where n.recipient_id = (select auth.uid()) and n.read_at is null),
    'unread_dm', (select count(*) from direct_messages d where d.recipient_id = (select auth.uid()) and d.read_at is null),
    'members', coalesce((select jsonb_agg(to_jsonb(p) order by p.full_name) from profiles p where p.org_id = (select org_id from me)), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from teams t where t.org_id = (select org_id from me)), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(to_jsonb(m)) from team_memberships m join teams t on t.id = m.team_id where t.org_id = (select org_id from me)), '[]'::jsonb)
  )
$$;

revoke execute on function public.orbit_bootstrap() from public, anon;
grant execute on function public.orbit_bootstrap() to authenticated;

-- 2. Herinneringen via pg_cron in plaats van bij elke paginaweergave ---------------------------

create or replace function public.refresh_reminders_all()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n int := 0; c int;
begin
  insert into notifications (org_id, recipient_id, kind, title, body, href, dedupe_key)
  select g.org_id, p.pid, 'deadline_soon', 'Deadline nadert',
         g.title || ' moet klaar zijn op ' || to_char(g.deadline, 'DD-MM-YYYY') || '.',
         '/goals/' || g.id, 'deadline_soon:' || g.id || ':' || g.deadline
  from goals g
  join lateral (
    select g.owner_id as pid
    union select a.profile_id from goal_assignments a where a.goal_id = g.id
  ) p on p.pid is not null
  where g.status <> 'achieved' and g.deadline between current_date and current_date + 7
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into notifications (org_id, recipient_id, kind, title, body, href, dedupe_key)
  select g.org_id, p.pid, 'milestone_near', 'Milestone in zicht',
         m.name || ' van ' || g.title || ' is bijna bereikt.',
         '/goals/' || g.id, 'milestone_near:' || m.id
  from milestones m
  join goals g on g.id = m.goal_id
  join lateral (
    select g.owner_id as pid
    union select a.profile_id from goal_assignments a where a.goal_id = g.id
  ) p on p.pid is not null
  where m.status = 'pending' and g.measure = 'numeric'
    and (g.current_value - g.start_value) / nullif(m.target_value - g.start_value, 0) >= 0.9
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  return n;
end $$;

revoke execute on function public.refresh_reminders_all() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
select cron.schedule('orbit-refresh-reminders', '*/5 * * * *', 'select public.refresh_reminders_all()');

-- 3. RLS: helpers één keer per query in plaats van per rij --------------------------------------

alter policy ae_select on public.activity_events
  using ((org_id = (select my_org_id())) AND ((goal_id IS NULL) OR can_view_goal(goal_id)));
alter policy cm_delete on public.comments
  using ((author_id = (select auth.uid())) OR (select is_admin()));
alter policy cm_insert on public.comments
  with check ((author_id = (select auth.uid())) AND (org_id = (select my_org_id())) AND can_view_goal(goal_id));
alter policy cm_update on public.comments
  using (author_id = (select auth.uid()));
alter policy ct_select on public.contributions
  using (org_id = (select my_org_id()));
alter policy dm_insert on public.direct_messages
  with check ((sender_id = (select auth.uid())) AND (org_id = (select my_org_id())) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = direct_messages.recipient_id) AND (p.org_id = (select my_org_id()))))));
alter policy gu_insert on public.goal_updates
  with check ((profile_id = (select auth.uid())) AND can_update_goal_progress(goal_id));
alter policy goals_insert on public.goals
  with check ((org_id = (select my_org_id())) AND (created_by = (select auth.uid())) AND (((goal_type = 'personal'::goal_type) AND (owner_id = (select auth.uid()))) OR (select is_admin())));
alter policy goals_select on public.goals
  using ((org_id = (select my_org_id())) AND ((owner_id = (select auth.uid())) OR (visibility = 'company'::goal_visibility) OR ((visibility = 'team'::goal_visibility) AND ((select is_admin()) OR ((team_id IS NOT NULL) AND is_team_member(team_id)) OR is_assigned_to_goal(id) OR is_shared_goal(id))) OR ((visibility = 'shared'::goal_visibility) AND (is_shared_goal(id) OR is_assigned_to_goal(id)))));
alter policy invitations_admin_all on public.invitations
  using ((org_id = (select my_org_id())) AND (select is_admin()))
  with check ((org_id = (select my_org_id())) AND (select is_admin()));
alter policy ka_select on public.kpi_assignments
  using (EXISTS ( SELECT 1
   FROM kpis k
  WHERE ((k.id = kpi_assignments.kpi_id) AND (k.org_id = (select my_org_id())))));
alter policy kc_insert on public.kpi_checkins
  with check ((profile_id = (select auth.uid())) AND can_checkin_kpi(kpi_id));
alter policy kc_select on public.kpi_checkins
  using (EXISTS ( SELECT 1
   FROM kpis k
  WHERE ((k.id = kpi_checkins.kpi_id) AND (k.org_id = (select my_org_id())))));
alter policy kc_update on public.kpi_checkins
  using (profile_id = (select auth.uid()));
alter policy kpis_insert on public.kpis
  with check ((org_id = (select my_org_id())) AND (created_by = (select auth.uid())) AND ((select is_admin()) OR ((scope = 'personal'::kpi_scope) AND (owner_id = (select auth.uid())))));
alter policy kpis_select on public.kpis
  using (org_id = (select my_org_id()));
alter policy kudos_delete on public.kudos
  using (from_id = (select auth.uid()));
alter policy kudos_insert on public.kudos
  with check ((org_id = (select my_org_id())) AND (from_id = (select auth.uid())) AND (from_id <> to_id) AND ((goal_id IS NULL) OR can_view_goal(goal_id)));
alter policy kudos_select on public.kudos
  using (org_id = (select my_org_id()));
alter policy mn_insert on public.mentions
  with check (EXISTS ( SELECT 1
   FROM comments c
  WHERE ((c.id = mentions.comment_id) AND (c.author_id = (select auth.uid())))));
alter policy nt_delete on public.notifications
  using (recipient_id = (select auth.uid()));
alter policy nt_select on public.notifications
  using (recipient_id = (select auth.uid()));
alter policy nt_update on public.notifications
  using (recipient_id = (select auth.uid()));
alter policy org_select on public.organizations
  using (id = (select my_org_id()));
alter policy org_update on public.organizations
  using ((id = (select my_org_id())) AND (select is_admin()));
alter policy profiles_select on public.profiles
  using ((id = (select auth.uid())) OR ((org_id IS NOT NULL) AND (org_id = (select my_org_id()))));
alter policy profiles_update on public.profiles
  using ((id = (select auth.uid())) OR ((select is_admin()) AND (org_id = (select my_org_id()))));
alter policy rx_delete on public.reactions
  using (profile_id = (select auth.uid()));
alter policy rx_insert on public.reactions
  with check ((profile_id = (select auth.uid())) AND can_view_goal(goal_of_comment(comment_id)));
alter policy rc_delete on public.recognitions
  using (recognized_by = (select auth.uid()));
alter policy rc_insert on public.recognitions
  with check ((recognized_by = (select auth.uid())) AND can_manage_goal(goal_of_update(goal_update_id)));
alter policy sf_all on public.saved_filters
  using (profile_id = (select auth.uid()))
  with check ((profile_id = (select auth.uid())) AND (org_id = (select my_org_id())));
alter policy tm_delete on public.team_memberships
  using ((select is_admin()) AND (EXISTS ( SELECT 1
   FROM teams t
  WHERE ((t.id = team_memberships.team_id) AND (t.org_id = (select my_org_id()))))));
alter policy tm_insert on public.team_memberships
  with check ((select is_admin()) AND (EXISTS ( SELECT 1
   FROM teams t
  WHERE ((t.id = team_memberships.team_id) AND (t.org_id = (select my_org_id()))))));
alter policy tm_select on public.team_memberships
  using (EXISTS ( SELECT 1
   FROM teams t
  WHERE ((t.id = team_memberships.team_id) AND (t.org_id = (select my_org_id())))));
alter policy tm_update on public.team_memberships
  using ((select is_admin()) AND (EXISTS ( SELECT 1
   FROM teams t
  WHERE ((t.id = team_memberships.team_id) AND (t.org_id = (select my_org_id()))))));
alter policy teams_delete on public.teams
  using ((org_id = (select my_org_id())) AND (select is_admin()));
alter policy teams_insert on public.teams
  with check ((org_id = (select my_org_id())) AND (select is_admin()));
alter policy teams_select on public.teams
  using (org_id = (select my_org_id()));
alter policy teams_update on public.teams
  using ((org_id = (select my_org_id())) AND (select is_admin()));

-- 4. Indexen -------------------------------------------------------------------------------------

create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id) where read_at is null;

create index if not exists activity_events_actor_idx on public.activity_events (actor_id);
create index if not exists activity_events_kpi_idx on public.activity_events (kpi_id);
create index if not exists comments_author_idx on public.comments (author_id);
create index if not exists comments_goal_update_idx on public.comments (goal_update_id);
create index if not exists comments_org_idx on public.comments (org_id);
create index if not exists contributions_team_idx on public.contributions (team_id);
create index if not exists direct_messages_org_idx on public.direct_messages (org_id);
create index if not exists goals_created_by_idx on public.goals (created_by);
create index if not exists invitations_accepted_by_idx on public.invitations (accepted_by);
create index if not exists invitations_invited_by_idx on public.invitations (invited_by);
create index if not exists kpi_assignments_assigned_by_idx on public.kpi_assignments (assigned_by);
create index if not exists kpis_created_by_idx on public.kpis (created_by);
create index if not exists kudos_from_idx on public.kudos (from_id);
create index if not exists kudos_goal_idx on public.kudos (goal_id);
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists notifications_org_idx on public.notifications (org_id);
create index if not exists reactions_profile_idx on public.reactions (profile_id);
create index if not exists recognitions_recognized_by_idx on public.recognitions (recognized_by);
create index if not exists saved_filters_org_idx on public.saved_filters (org_id);
create index if not exists teams_created_by_idx on public.teams (created_by);
