create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid references accounts(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  stage text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brushing_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  routine_type text not null default 'brush',
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds integer,
  bpm integer,
  top_teeth integer,
  bottom_teeth integer,
  song_title text,
  artist text,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  achievement_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now()
);

create index if not exists idx_members_household_id on members (household_id);
create index if not exists idx_brushing_sessions_member_id on brushing_sessions (member_id);
create index if not exists idx_brushing_sessions_started_at on brushing_sessions (started_at desc);
create index if not exists idx_achievements_member_id on achievements (member_id);