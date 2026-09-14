-- Kennismakingsvragen bij de eerste login: startdatum, aandachtsgebieden en eigen teamkeuze.
alter table profiles
  add column if not exists started_at date,
  add column if not exists focus text not null default '';

-- Leden mogen hun eigen teamlidmaatschappen kiezen (lead-vlaggen worden nooit via deze route gezet).
create or replace function set_my_teams(p_team_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select org_id into oid from profiles where id = auth.uid();
  if oid is null then raise exception 'Geen organisatie'; end if;
  if exists (select 1 from unnest(p_team_ids) tid where not exists (select 1 from teams t where t.id = tid and t.org_id = oid)) then
    raise exception 'Team hoort niet bij jouw organisatie';
  end if;
  delete from team_memberships tm
   where tm.profile_id = auth.uid()
     and tm.team_id in (select t.id from teams t where t.org_id = oid)
     and not (tm.team_id = any (p_team_ids));
  insert into team_memberships (team_id, profile_id)
  select tid, auth.uid() from unnest(p_team_ids) tid
  on conflict do nothing;
end $$;

revoke execute on function set_my_teams(uuid[]) from public, anon;
grant execute on function set_my_teams(uuid[]) to authenticated;
