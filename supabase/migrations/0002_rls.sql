-- 0002: helperfuncties + row level security.
-- Kernregel: een privédoel is via geen enkel pad zichtbaar voor iemand anders dan de eigenaar.

-- ---------------------------------------------------------------------------
-- Helpers (security definer: lezen profielen zonder RLS-recursie)
-- ---------------------------------------------------------------------------
create or replace function my_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function my_role() returns org_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'admin') from profiles where id = auth.uid()), false)
$$;

create or replace function is_team_member(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_memberships where team_id = tid and profile_id = auth.uid())
$$;

-- Zichtbaarheid van een doel voor de ingelogde gebruiker.
create or replace function can_view_goal(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from goals g
    where g.id = gid
      and g.org_id = my_org_id()
      and (
        g.owner_id = auth.uid()
        or (g.visibility = 'company')
        or (g.visibility = 'team' and (
              is_admin()
              or (g.team_id is not null and is_team_member(g.team_id))
              or exists (select 1 from goal_assignments a where a.goal_id = g.id and a.profile_id = auth.uid())
              or exists (select 1 from goal_shares s where s.goal_id = g.id and s.profile_id = auth.uid())
           ))
        or (g.visibility = 'shared' and (
              exists (select 1 from goal_shares s where s.goal_id = g.id and s.profile_id = auth.uid())
              or exists (select 1 from goal_assignments a where a.goal_id = g.id and a.profile_id = auth.uid())
           ))
        -- 'private': uitsluitend de eigenaar (eerste regel). Ook admins/owners niet.
      )
  )
$$;

-- Mag voortgang toevoegen: eigenaar, toegewezen persoon, gedeeld-met-bewerkrecht,
-- of admin bij team-/company-doelen.
create or replace function can_update_goal_progress(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from goals g
    where g.id = gid
      and g.org_id = my_org_id()
      and (
        g.owner_id = auth.uid()
        or exists (select 1 from goal_assignments a where a.goal_id = g.id and a.profile_id = auth.uid())
        or exists (select 1 from goal_shares s where s.goal_id = g.id and s.profile_id = auth.uid() and s.can_edit)
        or (is_admin() and g.visibility in ('team', 'company'))
      )
  )
$$;

-- Mag het doel beheren (bewerken, milestones, rechten, verwijderen).
create or replace function can_manage_goal(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from goals g
    where g.id = gid
      and g.org_id = my_org_id()
      and (
        g.owner_id = auth.uid()
        or g.created_by = auth.uid()
        or exists (select 1 from goal_shares s where s.goal_id = g.id and s.profile_id = auth.uid() and s.can_edit)
        or (is_admin() and g.visibility in ('team', 'company'))
      )
  )
$$;

create or replace function goal_of_milestone(mid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select goal_id from milestones where id = mid
$$;

create or replace function goal_of_comment(cid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select goal_id from comments where id = cid
$$;

create or replace function goal_of_update(uid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select goal_id from goal_updates where id = uid
$$;

create or replace function can_manage_kpi(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from kpis k where k.id = kid and k.org_id = my_org_id()
      and (is_admin() or k.owner_id = auth.uid() or k.created_by = auth.uid())
  )
$$;

create or replace function can_checkin_kpi(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from kpis k where k.id = kid and k.org_id = my_org_id()
      and (
        is_admin()
        or k.owner_id = auth.uid()
        or exists (select 1 from kpi_assignments a where a.kpi_id = k.id and a.profile_id = auth.uid())
        or (k.scope = 'team' and k.team_id is not null and is_team_member(k.team_id))
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Bescherming profielwijzigingen (rol-escalatie, org-wissel)
-- ---------------------------------------------------------------------------
create or replace function guard_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or current_setting('orbit.bypass_guard', true) = 'on' then
    return new; -- seed / service context of gerichte RPC
  end if;
  if new.role is distinct from old.role then
    if not is_admin() then
      raise exception 'Alleen een owner of admin kan rollen wijzigen';
    end if;
    if (new.role = 'owner' or old.role = 'owner') and my_role() <> 'owner' then
      raise exception 'Alleen de owner kan het eigenaarschap wijzigen';
    end if;
  end if;
  if new.org_id is distinct from old.org_id and old.org_id is not null then
    raise exception 'Organisatie kan niet gewijzigd worden';
  end if;
  if new.id <> auth.uid() and not is_admin() then
    raise exception 'Geen rechten om dit profiel te bewerken';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_changes();

-- ---------------------------------------------------------------------------
-- RLS inschakelen
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table invitations enable row level security;
alter table teams enable row level security;
alter table team_memberships enable row level security;
alter table goals enable row level security;
alter table goal_assignments enable row level security;
alter table goal_shares enable row level security;
alter table goal_updates enable row level security;
alter table milestones enable row level security;
alter table rewards enable row level security;
alter table kpis enable row level security;
alter table kpi_assignments enable row level security;
alter table kpi_checkins enable row level security;
alter table comments enable row level security;
alter table mentions enable row level security;
alter table reactions enable row level security;
alter table recognitions enable row level security;
alter table notifications enable row level security;
alter table contributions enable row level security;
alter table saved_filters enable row level security;
alter table activity_events enable row level security;

-- organizations
create policy org_select on organizations for select to authenticated using (id = my_org_id());
create policy org_update on organizations for update to authenticated using (id = my_org_id() and is_admin());

-- profiles
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or (org_id is not null and org_id = my_org_id()));
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or (is_admin() and org_id = my_org_id()));

-- invitations (alleen admins; invitee gebruikt RPC get_invitation/accept_invitation)
create policy invitations_admin_all on invitations for all to authenticated
  using (org_id = my_org_id() and is_admin()) with check (org_id = my_org_id() and is_admin());

-- teams
create policy teams_select on teams for select to authenticated using (org_id = my_org_id());
create policy teams_insert on teams for insert to authenticated with check (org_id = my_org_id() and is_admin());
create policy teams_update on teams for update to authenticated using (org_id = my_org_id() and is_admin());
create policy teams_delete on teams for delete to authenticated using (org_id = my_org_id() and is_admin());

-- team_memberships
create policy tm_select on team_memberships for select to authenticated
  using (exists (select 1 from teams t where t.id = team_id and t.org_id = my_org_id()));
create policy tm_insert on team_memberships for insert to authenticated
  with check (is_admin() and exists (select 1 from teams t where t.id = team_id and t.org_id = my_org_id()));
create policy tm_update on team_memberships for update to authenticated
  using (is_admin() and exists (select 1 from teams t where t.id = team_id and t.org_id = my_org_id()));
create policy tm_delete on team_memberships for delete to authenticated
  using (is_admin() and exists (select 1 from teams t where t.id = team_id and t.org_id = my_org_id()));

-- goals
create policy goals_select on goals for select to authenticated using (can_view_goal(id));
create policy goals_insert on goals for insert to authenticated
  with check (
    org_id = my_org_id()
    and created_by = auth.uid()
    and (
      (goal_type = 'personal' and owner_id = auth.uid())
      or is_admin()
    )
  );
create policy goals_update on goals for update to authenticated using (can_manage_goal(id));
create policy goals_delete on goals for delete to authenticated using (can_manage_goal(id));

-- goal_assignments
create policy ga_select on goal_assignments for select to authenticated using (can_view_goal(goal_id));
create policy ga_insert on goal_assignments for insert to authenticated with check (can_manage_goal(goal_id));
create policy ga_delete on goal_assignments for delete to authenticated using (can_manage_goal(goal_id));

-- goal_shares
create policy gs_select on goal_shares for select to authenticated using (can_view_goal(goal_id));
create policy gs_insert on goal_shares for insert to authenticated with check (can_manage_goal(goal_id));
create policy gs_update on goal_shares for update to authenticated using (can_manage_goal(goal_id));
create policy gs_delete on goal_shares for delete to authenticated using (can_manage_goal(goal_id));

-- goal_updates (historie: alleen toevoegen)
create policy gu_select on goal_updates for select to authenticated using (can_view_goal(goal_id));
create policy gu_insert on goal_updates for insert to authenticated
  with check (profile_id = auth.uid() and can_update_goal_progress(goal_id));

-- milestones
create policy ms_select on milestones for select to authenticated using (can_view_goal(goal_id));
create policy ms_insert on milestones for insert to authenticated with check (can_manage_goal(goal_id));
create policy ms_update on milestones for update to authenticated using (can_manage_goal(goal_id));
create policy ms_delete on milestones for delete to authenticated using (can_manage_goal(goal_id));

-- rewards
create policy rw_select on rewards for select to authenticated using (can_view_goal(goal_of_milestone(milestone_id)));
create policy rw_insert on rewards for insert to authenticated with check (can_manage_goal(goal_of_milestone(milestone_id)));
create policy rw_update on rewards for update to authenticated using (can_manage_goal(goal_of_milestone(milestone_id)));
create policy rw_delete on rewards for delete to authenticated using (can_manage_goal(goal_of_milestone(milestone_id)));

-- kpis (zichtbaar binnen de organisatie)
create policy kpis_select on kpis for select to authenticated using (org_id = my_org_id());
create policy kpis_insert on kpis for insert to authenticated
  with check (org_id = my_org_id() and created_by = auth.uid() and (is_admin() or (scope = 'personal' and owner_id = auth.uid())));
create policy kpis_update on kpis for update to authenticated using (can_manage_kpi(id));
create policy kpis_delete on kpis for delete to authenticated using (can_manage_kpi(id));

-- kpi_assignments
create policy ka_select on kpi_assignments for select to authenticated
  using (exists (select 1 from kpis k where k.id = kpi_id and k.org_id = my_org_id()));
create policy ka_insert on kpi_assignments for insert to authenticated with check (can_manage_kpi(kpi_id));
create policy ka_delete on kpi_assignments for delete to authenticated using (can_manage_kpi(kpi_id));

-- kpi_checkins
create policy kc_select on kpi_checkins for select to authenticated
  using (exists (select 1 from kpis k where k.id = kpi_id and k.org_id = my_org_id()));
create policy kc_insert on kpi_checkins for insert to authenticated
  with check (profile_id = auth.uid() and can_checkin_kpi(kpi_id));
create policy kc_update on kpi_checkins for update to authenticated
  using (profile_id = auth.uid());

-- comments
create policy cm_select on comments for select to authenticated using (can_view_goal(goal_id));
create policy cm_insert on comments for insert to authenticated
  with check (author_id = auth.uid() and org_id = my_org_id() and can_view_goal(goal_id));
create policy cm_update on comments for update to authenticated using (author_id = auth.uid());
create policy cm_delete on comments for delete to authenticated using (author_id = auth.uid() or is_admin());

-- mentions
create policy mn_select on mentions for select to authenticated using (can_view_goal(goal_of_comment(comment_id)));
create policy mn_insert on mentions for insert to authenticated
  with check (exists (select 1 from comments c where c.id = comment_id and c.author_id = auth.uid()));

-- reactions
create policy rx_select on reactions for select to authenticated using (can_view_goal(goal_of_comment(comment_id)));
create policy rx_insert on reactions for insert to authenticated
  with check (profile_id = auth.uid() and can_view_goal(goal_of_comment(comment_id)));
create policy rx_delete on reactions for delete to authenticated using (profile_id = auth.uid());

-- recognitions (door goal owner / admin)
create policy rc_select on recognitions for select to authenticated using (can_view_goal(goal_of_update(goal_update_id)));
create policy rc_insert on recognitions for insert to authenticated
  with check (recognized_by = auth.uid() and can_manage_goal(goal_of_update(goal_update_id)));
create policy rc_delete on recognitions for delete to authenticated using (recognized_by = auth.uid());

-- notifications
create policy nt_select on notifications for select to authenticated using (recipient_id = auth.uid());
create policy nt_update on notifications for update to authenticated using (recipient_id = auth.uid());
create policy nt_delete on notifications for delete to authenticated using (recipient_id = auth.uid());

-- contributions (transparant scorebord binnen de organisatie)
create policy ct_select on contributions for select to authenticated using (org_id = my_org_id());

-- saved_filters
create policy sf_all on saved_filters for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and org_id = my_org_id());

-- activity_events
create policy ae_select on activity_events for select to authenticated
  using (org_id = my_org_id() and (goal_id is null or can_view_goal(goal_id)));

-- storage: avatars (eigen map = eigen user-id)
create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- realtime
alter publication supabase_realtime add table comments, goal_updates, notifications, milestones, kpi_checkins, reactions;
