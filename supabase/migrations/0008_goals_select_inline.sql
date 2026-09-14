-- 0008: goals_select als inline-expressie, zodat INSERT ... RETURNING de nieuwe rij mag teruggeven.
-- (can_view_goal() is STABLE en ziet binnen hetzelfde statement de net ingevoegde rij niet.)
create or replace function is_assigned_to_goal(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from goal_assignments a where a.goal_id = gid and a.profile_id = auth.uid())
$$;
create or replace function is_shared_goal(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from goal_shares s where s.goal_id = gid and s.profile_id = auth.uid())
$$;
revoke execute on function is_assigned_to_goal(uuid), is_shared_goal(uuid) from public, anon;
grant execute on function is_assigned_to_goal(uuid), is_shared_goal(uuid) to authenticated;

drop policy if exists goals_select on goals;
create policy goals_select on goals for select to authenticated using (
  org_id = my_org_id() and (
    owner_id = auth.uid()
    or visibility = 'company'
    or (visibility = 'team' and (is_admin() or (team_id is not null and is_team_member(team_id)) or is_assigned_to_goal(id) or is_shared_goal(id)))
    or (visibility = 'shared' and (is_shared_goal(id) or is_assigned_to_goal(id)))
  )
);
