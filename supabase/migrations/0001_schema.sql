-- Orbit — performance cockpit
-- 0001: kern-schema. Alle tabellen, enums en indexen.
-- Tijdstempels zijn timestamptz (UTC). Auditvelden: created_at / updated_at / created_by.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type org_role as enum ('owner', 'admin', 'member');
create type goal_type as enum ('personal', 'team', 'company');
create type goal_visibility as enum ('private', 'shared', 'team', 'company');
create type progress_status as enum ('not_started', 'on_track', 'needs_attention', 'behind', 'achieved');
create type measure_kind as enum ('numeric', 'binary');
create type measure_frequency as enum ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
create type kpi_scope as enum ('personal', 'team', 'company');
create type kpi_direction as enum ('higher_better', 'lower_better');
create type milestone_status as enum ('pending', 'achieved');
create type reward_kind as enum ('team_outing', 'bonus', 'day_off', 'dinner', 'personal', 'other');
create type notification_kind as enum (
  'mention', 'reply', 'kpi_assigned', 'deadline_soon', 'milestone_near',
  'milestone_achieved', 'goal_behind', 'recognition', 'goal_assigned', 'invite'
);
create type contribution_kind as enum (
  'kpi_checkin', 'kpi_target_hit', 'ontime_checkin', 'goal_update',
  'milestone_achieved', 'recognition', 'goal_achieved', 'streak_bonus'
);
create type activity_kind as enum (
  'goal_created', 'goal_update', 'milestone_achieved', 'comment', 'status_change',
  'kpi_checkin', 'assignment', 'goal_achieved'
);
create type reaction_kind as enum ('like', 'ack');

-- ---------------------------------------------------------------------------
-- Organisaties & mensen
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_name text not null default 'Orbit',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  email text not null,
  full_name text not null default '',
  job_title text not null default '',
  avatar_url text,
  role org_role not null default 'member',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_org_idx on profiles(org_id);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  invited_by uuid references profiles(id) on delete set null,
  accepted_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index invitations_org_idx on invitations(org_id);

create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#496CFF',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_org_idx on teams(org_id);

create table team_memberships (
  team_id uuid not null references teams(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);
create index team_memberships_profile_idx on team_memberships(profile_id);

-- ---------------------------------------------------------------------------
-- Doelen
-- ---------------------------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  goal_type goal_type not null default 'personal',
  owner_id uuid not null references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  parent_goal_id uuid references goals(id) on delete set null,
  start_date date not null default current_date,
  deadline date not null,
  measure measure_kind not null default 'numeric',
  unit text not null default '',
  start_value numeric not null default 0,
  target_value numeric not null default 1,
  current_value numeric not null default 0,
  frequency measure_frequency not null default 'weekly',
  visibility goal_visibility not null default 'team',
  status progress_status not null default 'not_started',
  category text not null default 'Algemeen',
  is_featured boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  achieved_at timestamptz,
  constraint goals_deadline_after_start check (deadline >= start_date),
  constraint goals_target_not_start check (measure = 'binary' or target_value <> start_value)
);
create index goals_org_idx on goals(org_id);
create index goals_owner_idx on goals(owner_id);
create index goals_team_idx on goals(team_id);
create index goals_parent_idx on goals(parent_goal_id);

create table goal_assignments (
  goal_id uuid not null references goals(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_responsible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (goal_id, profile_id)
);
create index goal_assignments_profile_idx on goal_assignments(profile_id);

-- Personen die een 'shared' persoonlijk doel mogen zien.
create table goal_shares (
  goal_id uuid not null references goals(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (goal_id, profile_id)
);
create index goal_shares_profile_idx on goal_shares(profile_id);

create table goal_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  previous_value numeric not null,
  new_value numeric not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index goal_updates_goal_idx on goal_updates(goal_id, created_at desc);
create index goal_updates_profile_idx on goal_updates(profile_id, created_at desc);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  name text not null,
  description text not null default '',
  target_value numeric not null,
  target_date date,
  is_ultimate boolean not null default false,
  status milestone_status not null default 'pending',
  achieved_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index milestones_goal_idx on milestones(goal_id, sort_order);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id) on delete cascade,
  title text not null,
  kind reward_kind not null default 'other',
  description text not null default '',
  granted_at timestamptz,
  created_at timestamptz not null default now()
);
create index rewards_milestone_idx on rewards(milestone_id);

-- ---------------------------------------------------------------------------
-- KPI's
-- ---------------------------------------------------------------------------
create table kpis (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'Algemeen',
  scope kpi_scope not null default 'personal',
  owner_id uuid references profiles(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  frequency measure_frequency not null default 'weekly',
  direction kpi_direction not null default 'higher_better',
  target_value numeric not null,
  current_value numeric,
  unit text not null default '',
  period_start date not null default current_date,
  period_end date,
  status progress_status not null default 'not_started',
  source_note text not null default '',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kpis_org_idx on kpis(org_id);
create index kpis_owner_idx on kpis(owner_id);
create index kpis_team_idx on kpis(team_id);

create table kpi_assignments (
  kpi_id uuid not null references kpis(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (kpi_id, profile_id)
);
create index kpi_assignments_profile_idx on kpi_assignments(profile_id);

create table kpi_checkins (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references kpis(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  value numeric not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (kpi_id, profile_id, period_start)
);
create index kpi_checkins_kpi_idx on kpi_checkins(kpi_id, period_start desc);
create index kpi_checkins_profile_idx on kpi_checkins(profile_id, period_start desc);

-- ---------------------------------------------------------------------------
-- Communicatie
-- ---------------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  goal_update_id uuid references goal_updates(id) on delete set null,
  parent_comment_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_goal_idx on comments(goal_id, created_at);
create index comments_parent_idx on comments(parent_comment_id);

create table mentions (
  comment_id uuid not null references comments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id)
);
create index mentions_profile_idx on mentions(profile_id);

create table reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  kind reaction_kind not null default 'like',
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id, kind)
);

-- Erkenning door de goal owner van een voortgangsupdate (telt mee in de bijdragescore).
create table recognitions (
  goal_update_id uuid not null references goal_updates(id) on delete cascade,
  recognized_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_update_id, recognized_by)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  kind notification_kind not null,
  title text not null,
  body text not null default '',
  href text not null default '/dashboard',
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on notifications(recipient_id, created_at desc);
create unique index notifications_dedupe_idx on notifications(recipient_id, dedupe_key) where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- Bijdragen (scorebord-grootboek), filters, activiteit
-- ---------------------------------------------------------------------------
create table contributions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  kind contribution_kind not null,
  points int not null,
  ref_table text,
  ref_id uuid,
  note text not null default '',
  occurred_at timestamptz not null default now()
);
create index contributions_profile_idx on contributions(profile_id, occurred_at desc);
create index contributions_org_idx on contributions(org_id, occurred_at desc);
create unique index contributions_unique_ref on contributions(profile_id, kind, ref_id) where ref_id is not null;

create table saved_filters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  route text not null default '/dashboard',
  query text not null default '',
  created_at timestamptz not null default now()
);
create index saved_filters_profile_idx on saved_filters(profile_id);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  goal_id uuid references goals(id) on delete cascade,
  kpi_id uuid references kpis(id) on delete cascade,
  kind activity_kind not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_org_idx on activity_events(org_id, created_at desc);
create index activity_events_goal_idx on activity_events(goal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at bijhouden
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger teams_updated before update on teams for each row execute function set_updated_at();
create trigger goals_updated before update on goals for each row execute function set_updated_at();
create trigger milestones_updated before update on milestones for each row execute function set_updated_at();
create trigger kpis_updated before update on kpis for each row execute function set_updated_at();
create trigger comments_updated before update on comments for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiel automatisch aanmaken bij nieuwe auth-gebruiker
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage: profielfoto's
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
