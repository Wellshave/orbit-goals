-- 0005: kudos (high-fives, bedankjes, vieringen) tussen teamleden.
create type kudos_kind as enum ('high_five', 'thanks', 'celebrate');

create table kudos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  kind kudos_kind not null default 'high_five',
  message text not null default '',
  goal_id uuid references goals(id) on delete set null,
  created_at timestamptz not null default now()
);
create index kudos_org_idx on kudos(org_id, created_at desc);
create index kudos_to_idx on kudos(to_id, created_at desc);

alter table kudos enable row level security;
create policy kudos_select on kudos for select to authenticated using (org_id = my_org_id());
create policy kudos_insert on kudos for insert to authenticated
  with check (org_id = my_org_id() and from_id = auth.uid() and from_id <> to_id and (goal_id is null or can_view_goal(goal_id)));
create policy kudos_delete on kudos for delete to authenticated using (from_id = auth.uid());

create or replace function kudos_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text; title text;
begin
  select full_name into actor from profiles where id = new.from_id;
  title := case new.kind when 'high_five' then actor || ' gaf je een high-five' when 'thanks' then actor || ' bedankt je voor je bijdrage' else actor || ' viert je milestone mee' end;
  insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href)
  values (new.org_id, new.to_id, new.from_id, 'recognition', title, new.message, coalesce('/goals/' || new.goal_id, '/scoreboard'));
  return new;
end $$;
create trigger kudos_after_insert after insert on kudos for each row execute function kudos_after_insert();
revoke execute on function kudos_after_insert() from public, anon, authenticated;

-- Teamkleuren in het nieuwe palet
update teams set color = case name when 'Marketing' then '#9B72F2' when 'Sales & Marketplaces' then '#5B6CFF' when 'Operations' then '#FF7B6B' else color end;
