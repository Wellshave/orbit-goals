-- 0003: bedrijfslogica in de database.
-- Voortgang, statusberekening, automatische milestone-detectie, notificaties,
-- bijdragen-grootboek en RPC's. Triggerfuncties zijn security definer zodat
-- neveneffecten (notificaties voor anderen, contributions) niet door RLS
-- van de aanroeper geblokkeerd worden.

-- ---------------------------------------------------------------------------
-- Voortgang & status
-- ---------------------------------------------------------------------------
create or replace function goal_progress(g goals) returns numeric
language sql immutable as $$
  select case
    when g.measure = 'binary' then least(1, greatest(0, g.current_value))
    when g.target_value = g.start_value then 0
    else greatest(0, (g.current_value - g.start_value) / (g.target_value - g.start_value))
  end
$$;

-- Verwachte voortgang op basis van verstreken tijd (0..1).
create or replace function goal_expected_progress(g goals, at_date date default current_date) returns numeric
language sql immutable as $$
  select case
    when g.deadline <= g.start_date then 1
    when at_date <= g.start_date then 0
    else least(1, (at_date - g.start_date)::numeric / (g.deadline - g.start_date)::numeric)
  end
$$;

create or replace function compute_goal_status(g goals) returns progress_status
language plpgsql immutable as $$
declare
  p numeric := goal_progress(g);
  e numeric := goal_expected_progress(g, current_date);
begin
  if p >= 1 then return 'achieved'; end if;
  if g.measure = 'binary' then
    if current_date > g.deadline then return 'behind'; end if;
    if current_date < g.start_date then return 'not_started'; end if;
    return case when e > 0.85 then 'needs_attention' else 'on_track' end;
  end if;
  if p <= 0 and current_date < g.start_date then return 'not_started'; end if;
  if current_date > g.deadline then return 'behind'; end if;
  if e <= 0 then return case when p > 0 then 'on_track' else 'not_started' end; end if;
  if p >= e * 0.9 then return 'on_track'; end if;
  if p >= e * 0.7 then return 'needs_attention'; end if;
  return 'behind';
end $$;

-- BEFORE insert/update op goals: status + achieved_at consistent houden.
create or replace function goals_before_write() returns trigger
language plpgsql as $$
begin
  if new.measure = 'binary' then
    new.unit := '';
    new.start_value := 0;
    new.target_value := 1;
  end if;
  new.status := compute_goal_status(new);
  if new.status = 'achieved' and new.achieved_at is null then
    new.achieved_at := now();
  elsif new.status <> 'achieved' then
    new.achieved_at := null;
  end if;
  return new;
end $$;

create trigger goals_before_write before insert or update on goals
  for each row execute function goals_before_write();

-- AFTER insert/update op goals: activiteit, notificaties, bijdragen.
create or replace function goals_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if tg_op = 'INSERT' then
    insert into activity_events (org_id, actor_id, goal_id, kind, payload)
    values (new.org_id, new.created_by, new.id, 'goal_created', jsonb_build_object('title', new.title));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into activity_events (org_id, actor_id, goal_id, kind, payload)
    values (new.org_id, null, new.id, 'status_change', jsonb_build_object('from', old.status, 'to', new.status));

    if new.status = 'behind' then
      for r in
        select owner_id as pid from goals where id = new.id
        union select profile_id from goal_assignments where goal_id = new.id
      loop
        insert into notifications (org_id, recipient_id, kind, title, body, href, dedupe_key)
        values (new.org_id, r.pid, 'goal_behind', 'Doel loopt achter',
                new.title || ' ligt achter op het verwachte tempo.',
                '/goals/' || new.id, 'goal_behind:' || new.id || ':' || to_char(now(), 'IYYY-IW'))
        on conflict do nothing;
      end loop;
    end if;

    if new.status = 'achieved' then
      insert into activity_events (org_id, actor_id, goal_id, kind, payload)
      values (new.org_id, null, new.id, 'goal_achieved', jsonb_build_object('title', new.title));
      for r in
        select owner_id as pid from goals where id = new.id
        union select profile_id from goal_assignments where goal_id = new.id
      loop
        insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
        values (new.org_id, r.pid, new.team_id, 'goal_achieved', 60, 'goals', new.id, new.title, coalesce(new.achieved_at, now()))
        on conflict do nothing;
      end loop;
    end if;
  end if;
  return new;
end $$;

create trigger goals_after_write after insert or update on goals
  for each row execute function goals_after_write();

-- ---------------------------------------------------------------------------
-- Voortgangsupdate → huidige waarde, milestones, bijdragen, notificaties
-- ---------------------------------------------------------------------------
create or replace function milestone_reached(g goals, m milestones, v numeric) returns boolean
language sql immutable as $$
  select case
    when g.measure = 'binary' then v >= 1
    when g.target_value >= g.start_value then v >= m.target_value
    else v <= m.target_value
  end
$$;

create or replace function goal_updates_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  g goals;
  m milestones;
  r record;
  actor_name text;
begin
  select * into g from goals where id = new.goal_id;
  select full_name into actor_name from profiles where id = new.profile_id;

  update goals set current_value = new.new_value where id = new.goal_id;
  select * into g from goals where id = new.goal_id;

  insert into activity_events (org_id, actor_id, goal_id, kind, payload)
  values (g.org_id, new.profile_id, g.id, 'goal_update',
          jsonb_build_object('previous', new.previous_value, 'new', new.new_value, 'note', new.note, 'update_id', new.id));

  insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
  values (g.org_id, new.profile_id, g.team_id, 'goal_update', 5, 'goal_updates', new.id, g.title, new.created_at)
  on conflict do nothing;

  -- Milestones automatisch herkennen
  for m in
    select * from milestones where goal_id = g.id and status = 'pending' order by sort_order
  loop
    if milestone_reached(g, m, new.new_value) then
      update milestones set status = 'achieved', achieved_at = new.created_at where id = m.id;

      insert into activity_events (org_id, actor_id, goal_id, kind, payload)
      values (g.org_id, new.profile_id, g.id, 'milestone_achieved',
              jsonb_build_object('milestone_id', m.id, 'name', m.name, 'target_value', m.target_value, 'is_ultimate', m.is_ultimate));

      for r in
        select owner_id as pid from goals where id = g.id
        union select profile_id from goal_assignments where goal_id = g.id
        union select profile_id from goal_shares where goal_id = g.id
      loop
        insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href, dedupe_key)
        values (g.org_id, r.pid, new.profile_id, 'milestone_achieved',
                'Milestone behaald: ' || m.name,
                g.title || ' passeerde ' || m.name || '.',
                '/goals/' || g.id || '?celebrate=' || m.id, 'milestone_achieved:' || m.id)
        on conflict do nothing;
      end loop;

      for r in
        select owner_id as pid from goals where id = g.id
        union select profile_id from goal_assignments where goal_id = g.id and is_responsible
      loop
        insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
        values (g.org_id, r.pid, g.team_id, 'milestone_achieved', 40, 'milestones', m.id, m.name || ' · ' || g.title, new.created_at)
        on conflict do nothing;
      end loop;
    end if;
  end loop;
  return new;
end $$;

create trigger goal_updates_after_insert after insert on goal_updates
  for each row execute function goal_updates_after_insert();

-- Nieuwe milestone die al gepasseerd is: stil als behaald markeren.
create or replace function milestones_before_write() returns trigger
language plpgsql as $$
declare g goals;
begin
  select * into g from goals where id = new.goal_id;
  if new.status = 'pending' and milestone_reached(g, new, g.current_value) and goal_progress(g) > 0 then
    new.status := 'achieved';
    new.achieved_at := coalesce(new.achieved_at, now());
  end if;
  return new;
end $$;

create trigger milestones_before_write before insert or update of target_value on milestones
  for each row execute function milestones_before_write();

-- Toewijzing → notificatie
create or replace function goal_assignments_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare g goals;
begin
  select * into g from goals where id = new.goal_id;
  insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href, dedupe_key)
  values (g.org_id, new.profile_id, g.created_by, 'goal_assigned', 'Doel aan je toegewezen', g.title, '/goals/' || g.id, 'goal_assigned:' || g.id || ':' || new.profile_id)
  on conflict do nothing;
  insert into activity_events (org_id, actor_id, goal_id, kind, payload)
  values (g.org_id, g.created_by, g.id, 'assignment', jsonb_build_object('profile_id', new.profile_id));
  return new;
end $$;

create trigger goal_assignments_after_insert after insert on goal_assignments
  for each row execute function goal_assignments_after_insert();

-- ---------------------------------------------------------------------------
-- KPI check-ins
-- ---------------------------------------------------------------------------
create or replace function kpi_target_hit(k kpis, v numeric) returns boolean
language sql immutable as $$
  select case when k.direction = 'higher_better' then v >= k.target_value else v <= k.target_value end
$$;

create or replace function kpi_ratio(k kpis, v numeric) returns numeric
language sql immutable as $$
  select case
    when k.direction = 'higher_better' then case when k.target_value = 0 then 1 else v / k.target_value end
    else case when v = 0 then 1 else k.target_value / v end
  end
$$;

create or replace function kpi_status_for(k kpis, v numeric) returns progress_status
language sql immutable as $$
  select case
    when v is null then 'not_started'::progress_status
    when kpi_ratio(k, v) >= 1 then 'achieved'
    when kpi_ratio(k, v) >= 0.9 then 'on_track'
    when kpi_ratio(k, v) >= 0.7 then 'needs_attention'
    else 'behind'
  end
$$;

-- Aantal opeenvolgende periodes (tot en met de laatste check-in) waarin het target gehaald is.
create or replace function kpi_streak(p_kpi uuid, p_profile uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  k kpis; c record; n int := 0;
begin
  select * into k from kpis where id = p_kpi;
  for c in select value from kpi_checkins where kpi_id = p_kpi and profile_id = p_profile order by period_start desc loop
    if kpi_target_hit(k, c.value) then n := n + 1; else exit; end if;
  end loop;
  return n;
end $$;

create or replace function kpi_checkins_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k kpis; latest record; streak int;
begin
  select * into k from kpis where id = new.kpi_id;

  -- Huidige waarde = de meest recente periode (over alle toegewezen personen: som bij team/company, anders de waarde).
  select period_start into latest from kpi_checkins where kpi_id = k.id order by period_start desc limit 1;
  if latest.period_start = new.period_start then
    update kpis set
      current_value = (select case when k.scope = 'personal' then max(value) else sum(value) end from kpi_checkins where kpi_id = k.id and period_start = latest.period_start),
      status = kpi_status_for(k, (select case when k.scope = 'personal' then max(value) else sum(value) end from kpi_checkins where kpi_id = k.id and period_start = latest.period_start))
    where id = k.id;
  end if;

  if tg_op = 'INSERT' then
    insert into activity_events (org_id, actor_id, kpi_id, kind, payload)
    values (k.org_id, new.profile_id, k.id, 'kpi_checkin', jsonb_build_object('value', new.value, 'period_start', new.period_start, 'name', k.name));

    insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
    values (k.org_id, new.profile_id, k.team_id, 'kpi_checkin', 10, 'kpi_checkins', new.id, k.name, new.created_at)
    on conflict do nothing;

    if new.created_at::date <= new.period_end + 2 then
      insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
      values (k.org_id, new.profile_id, k.team_id, 'ontime_checkin', 5, 'kpi_checkins', new.id, k.name, new.created_at)
      on conflict do nothing;
    end if;
  end if;

  -- Target gehaald (bij update opnieuw beoordelen)
  delete from contributions where profile_id = new.profile_id and kind in ('kpi_target_hit', 'streak_bonus') and ref_id = new.id;
  if kpi_target_hit(k, new.value) then
    insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
    values (k.org_id, new.profile_id, k.team_id, 'kpi_target_hit', 25, 'kpi_checkins', new.id, k.name, new.created_at);
    streak := kpi_streak(k.id, new.profile_id);
    if streak >= 3 then
      insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
      values (k.org_id, new.profile_id, k.team_id, 'streak_bonus', 10, 'kpi_checkins', new.id, k.name || ' · ' || streak || ' periodes op rij', new.created_at);
    end if;
  end if;
  return new;
end $$;

create trigger kpi_checkins_after_write after insert or update on kpi_checkins
  for each row execute function kpi_checkins_after_write();

create or replace function kpi_assignments_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare k kpis;
begin
  select * into k from kpis where id = new.kpi_id;
  insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href, dedupe_key)
  values (k.org_id, new.profile_id, new.assigned_by, 'kpi_assigned', 'KPI aan je toegewezen', k.name || ' (' || k.frequency || ')', '/kpis/' || k.id, 'kpi_assigned:' || k.id || ':' || new.profile_id)
  on conflict do nothing;
  return new;
end $$;

create trigger kpi_assignments_after_insert after insert on kpi_assignments
  for each row execute function kpi_assignments_after_insert();

-- ---------------------------------------------------------------------------
-- Reacties, vermeldingen, erkenning
-- ---------------------------------------------------------------------------
create or replace function comments_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent comments; g goals; actor text;
begin
  select * into g from goals where id = new.goal_id;
  select full_name into actor from profiles where id = new.author_id;
  insert into activity_events (org_id, actor_id, goal_id, kind, payload)
  values (new.org_id, new.author_id, new.goal_id, 'comment', jsonb_build_object('comment_id', new.id, 'body', left(new.body, 140)));

  if new.parent_comment_id is not null then
    select * into parent from comments where id = new.parent_comment_id;
    if parent.author_id <> new.author_id then
      insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href)
      values (new.org_id, parent.author_id, new.author_id, 'reply', actor || ' reageerde op je bericht', left(new.body, 140), '/goals/' || new.goal_id || '#c-' || new.id);
    end if;
  elsif new.goal_update_id is not null then
    insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href)
    select new.org_id, u.profile_id, new.author_id, 'reply', actor || ' reageerde op je update', left(new.body, 140), '/goals/' || new.goal_id || '#c-' || new.id
    from goal_updates u where u.id = new.goal_update_id and u.profile_id <> new.author_id;
  end if;
  return new;
end $$;

create trigger comments_after_insert after insert on comments
  for each row execute function comments_after_insert();

create or replace function mentions_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c comments; actor text;
begin
  select * into c from comments where id = new.comment_id;
  if c.author_id = new.profile_id then return new; end if;
  select full_name into actor from profiles where id = c.author_id;
  insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href)
  values (c.org_id, new.profile_id, c.author_id, 'mention', actor || ' noemde je', left(c.body, 140), '/goals/' || c.goal_id || '#c-' || c.id);
  return new;
end $$;

create trigger mentions_after_insert after insert on mentions
  for each row execute function mentions_after_insert();

create or replace function recognitions_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare u goal_updates; g goals; actor text;
begin
  select * into u from goal_updates where id = new.goal_update_id;
  select * into g from goals where id = u.goal_id;
  select full_name into actor from profiles where id = new.recognized_by;
  insert into contributions (org_id, profile_id, team_id, kind, points, ref_table, ref_id, note, occurred_at)
  values (g.org_id, u.profile_id, g.team_id, 'recognition', 15, 'goal_updates', u.id, 'Erkend door ' || actor || ' · ' || g.title, new.created_at)
  on conflict do nothing;
  if u.profile_id <> new.recognized_by then
    insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href)
    values (g.org_id, u.profile_id, new.recognized_by, 'recognition', actor || ' erkende je bijdrage', g.title, '/goals/' || g.id);
  end if;
  return new;
end $$;

create trigger recognitions_after_insert after insert on recognitions
  for each row execute function recognitions_after_insert();

create or replace function recognitions_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from contributions where kind = 'recognition' and ref_id = old.goal_update_id;
  return old;
end $$;

create trigger recognitions_after_delete after delete on recognitions
  for each row execute function recognitions_after_delete();

-- ---------------------------------------------------------------------------
-- RPC's
-- ---------------------------------------------------------------------------

-- Organisatie aanmaken tijdens onboarding: de maker wordt owner.
create or replace function create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  oid uuid; s text;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  if (select org_id from profiles where id = auth.uid()) is not null then
    raise exception 'Je zit al in een organisatie';
  end if;
  s := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);
  insert into organizations (name, slug) values (p_name, s) returning id into oid;
  perform set_config('orbit.bypass_guard', 'on', true);
  update profiles set org_id = oid, role = 'owner' where id = auth.uid();
  return oid;
end $$;

-- Uitnodiging inzien (zonder in de organisatie te zitten).
create or replace function get_invitation(p_token text)
returns table (email text, role org_role, org_name text, expires_at timestamptz, accepted boolean)
language sql stable security definer set search_path = public as $$
  select i.email, i.role, o.name, i.expires_at, i.accepted_at is not null
  from invitations i join organizations o on o.id = i.org_id
  where i.token = p_token
$$;

create or replace function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invitations; p profiles;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select * into inv from invitations where token = p_token;
  if inv.id is null then raise exception 'Uitnodiging niet gevonden'; end if;
  if inv.accepted_at is not null then raise exception 'Uitnodiging is al gebruikt'; end if;
  if inv.expires_at < now() then raise exception 'Uitnodiging is verlopen'; end if;
  select * into p from profiles where id = auth.uid();
  if p.org_id is not null and p.org_id <> inv.org_id then raise exception 'Je zit al in een andere organisatie'; end if;
  perform set_config('orbit.bypass_guard', 'on', true);
  update profiles set org_id = inv.org_id, role = inv.role where id = auth.uid();
  update invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.org_id;
end $$;

-- Herinneringen genereren (idempotent via dedupe_key). Aangeroepen bij het laden van het dashboard.
create or replace function refresh_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  oid uuid := my_org_id(); n int := 0; r record;
begin
  if oid is null then return 0; end if;

  -- Naderende deadlines (binnen 7 dagen, nog niet behaald)
  for r in
    select g.id, g.title, g.deadline, p.pid
    from goals g
    join lateral (
      select owner_id as pid from goals x where x.id = g.id
      union select profile_id from goal_assignments a where a.goal_id = g.id
    ) p on true
    where g.org_id = oid and g.status <> 'achieved'
      and g.deadline between current_date and current_date + 7
  loop
    insert into notifications (org_id, recipient_id, kind, title, body, href, dedupe_key)
    values (oid, r.pid, 'deadline_soon', 'Deadline nadert', r.title || ' moet klaar zijn op ' || to_char(r.deadline, 'DD-MM-YYYY') || '.', '/goals/' || r.id, 'deadline_soon:' || r.id || ':' || r.deadline)
    on conflict do nothing;
    n := n + 1;
  end loop;

  -- Milestone bijna bereikt (>= 90% van de afstand naar de milestone)
  for r in
    select m.id as mid, m.name, g.id as gid, g.title, p.pid
    from milestones m
    join goals g on g.id = m.goal_id
    join lateral (
      select owner_id as pid from goals x where x.id = g.id
      union select profile_id from goal_assignments a where a.goal_id = g.id
    ) p on true
    where g.org_id = oid and m.status = 'pending' and g.measure = 'numeric'
      and m.target_value <> g.start_value
      and (g.current_value - g.start_value) / (m.target_value - g.start_value) >= 0.9
  loop
    insert into notifications (org_id, recipient_id, kind, title, body, href, dedupe_key)
    values (oid, r.pid, 'milestone_near', 'Milestone in zicht', r.name || ' van ' || r.title || ' is bijna bereikt.', '/goals/' || r.gid, 'milestone_near:' || r.mid)
    on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Scorebord: punten per persoon en per soort in een periode.
create or replace function scoreboard(p_from timestamptz, p_to timestamptz, p_team uuid default null)
returns table (profile_id uuid, kind contribution_kind, points bigint, entries bigint)
language sql stable security definer set search_path = public as $$
  select c.profile_id, c.kind, sum(c.points)::bigint, count(*)::bigint
  from contributions c
  where c.org_id = my_org_id()
    and c.occurred_at >= p_from and c.occurred_at < p_to
    and (p_team is null or c.profile_id in (select profile_id from team_memberships where team_id = p_team))
  group by c.profile_id, c.kind
$$;

-- Profiel + rol aanpassen door admins (rolwissel wordt door de guard-trigger gecontroleerd).
create or replace function set_member_role(p_profile uuid, p_role org_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Geen rechten'; end if;
  if (select org_id from profiles where id = p_profile) <> my_org_id() then raise exception 'Geen rechten'; end if;
  if p_role = 'owner' and my_role() <> 'owner' then raise exception 'Alleen de owner kan eigenaarschap overdragen'; end if;
  if (select role from profiles where id = p_profile) = 'owner' and my_role() <> 'owner' then raise exception 'De owner kan niet door een admin gewijzigd worden'; end if;
  update profiles set role = p_role where id = p_profile;
end $$;

-- Lid verwijderen uit organisatie (loskoppelen, account blijft bestaan).
create or replace function remove_member(p_profile uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Geen rechten'; end if;
  if p_profile = auth.uid() then raise exception 'Je kunt jezelf niet verwijderen'; end if;
  if (select role from profiles where id = p_profile) = 'owner' then raise exception 'De owner kan niet verwijderd worden'; end if;
  if (select org_id from profiles where id = p_profile) <> my_org_id() then raise exception 'Geen rechten'; end if;
  delete from team_memberships where profile_id = p_profile;
  delete from goal_assignments where profile_id = p_profile;
  delete from kpi_assignments where profile_id = p_profile;
  perform set_config('orbit.bypass_guard', 'on', true);
  update profiles set org_id = null, role = 'member' where id = p_profile;
end $$;
