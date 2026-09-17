-- Doelvorm (format) los van scope (goal_type + visibility), plus gekoppelde routines.
do $$ begin
  create type goal_format as enum ('achievement', 'numeric_target', 'habit', 'improvement', 'project');
exception when duplicate_object then null; end $$;

alter table goals
  add column if not exists format goal_format not null default 'numeric_target',
  add column if not exists details jsonb not null default '{}'::jsonb;

-- Bestaande doelen: vorm afleiden uit de meetinstellingen; numeric_target is de veilige fallback.
update goals set format = (case
    when measure = 'binary' then 'achievement'
    when target_value < start_value then 'improvement'
    else 'numeric_target' end)::goal_format
where details = '{}'::jsonb and format = 'numeric_target';

-- Ondersteunende routine binnen een doel (bijv. "3x per week trainen" bij een halve marathon).
create table if not exists goal_routines (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  times_per_period int not null check (times_per_period between 1 and 50),
  period text not null default 'week' check (period in ('day', 'week', 'month')),
  track text not null default 'sessions' check (track in ('sessions', 'quantity', 'both')),
  unit text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists goal_routines_goal_idx on goal_routines(goal_id);

create table if not exists routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references goal_routines(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null default current_date,
  quantity numeric,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists routine_logs_routine_idx on routine_logs(routine_id, logged_on desc);
create index if not exists routine_logs_profile_idx on routine_logs(profile_id);

alter table goal_routines enable row level security;
alter table routine_logs enable row level security;

-- Zichtbaarheid volgt het doel: de subquery op goals valt zelf onder goals_select (privé blijft privé).
drop policy if exists gr_select on goal_routines;
create policy gr_select on goal_routines for select to authenticated
  using (exists (select 1 from goals g where g.id = goal_id));
drop policy if exists gr_insert on goal_routines;
create policy gr_insert on goal_routines for insert to authenticated with check (can_manage_goal(goal_id));
drop policy if exists gr_update on goal_routines;
create policy gr_update on goal_routines for update to authenticated using (can_manage_goal(goal_id));
drop policy if exists gr_delete on goal_routines;
create policy gr_delete on goal_routines for delete to authenticated using (can_manage_goal(goal_id));

drop policy if exists rl_select on routine_logs;
create policy rl_select on routine_logs for select to authenticated
  using (exists (select 1 from goal_routines r where r.id = routine_id));
drop policy if exists rl_insert on routine_logs;
create policy rl_insert on routine_logs for insert to authenticated
  with check (profile_id = (select auth.uid())
    and exists (select 1 from goal_routines r where r.id = routine_id and can_update_goal_progress(r.goal_id)));
drop policy if exists rl_delete on routine_logs;
create policy rl_delete on routine_logs for delete to authenticated using (profile_id = (select auth.uid()));
