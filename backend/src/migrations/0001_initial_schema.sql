-- =============================================================================
-- WhistleOps — Initial Schema (0001)
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- Idempotent: safe to re-run.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- certification_levels (NEW — replaces legacy Goalline level strings)
-- ============================================================================
create table if not exists public.certification_levels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists certification_levels_sort_order_idx
  on public.certification_levels (sort_order);

-- ============================================================================
-- league_qualifications (NEW — minimum certification level required per league)
-- ============================================================================
create table if not exists public.league_qualifications (
  id                 uuid primary key default gen_random_uuid(),
  league_name        text not null unique,
  minimum_level_id   uuid not null references public.certification_levels(id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists league_qualifications_min_level_idx
  on public.league_qualifications (minimum_level_id);

-- ============================================================================
-- venues
-- ============================================================================
create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  lat         numeric,
  lng         numeric,
  timezone    text not null default 'America/Halifax',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- profiles
--   user_id links to Supabase Auth (auth.users.id), nullable for roster-only
--   official_level_id links to certification_levels (NEW — replaces text field)
-- ============================================================================
create table if not exists public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users(id) on delete set null,
  email               text not null unique,
  full_name           text,
  jersey_number       text,
  date_of_birth       date,
  cell_phone          text,
  role                text not null default 'OFFICIAL'
                      check (role in ('ADMIN','FINANCE','OFFICIAL','SUPERVISOR')),
  official_type       text check (official_type in ('REFEREE','LINESMAN')),
  official_level_id   uuid references public.certification_levels(id) on delete set null,
  home_address        text,
  home_lat            numeric,
  home_lng            numeric,
  avatar_url          text,
  distance_km         numeric,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_role_idx    on public.profiles (role);
create index if not exists profiles_level_idx   on public.profiles (official_level_id);

-- ============================================================================
-- games
-- ============================================================================
create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  date_time    timestamptz not null,
  venue_id     uuid references public.venues(id) on delete set null,
  status       text not null default 'UNASSIGNED'
               check (status in ('UNASSIGNED','ASSIGNED','COMPLETED','CANCELLED')),
  home_team    text,
  away_team    text,
  league_tier  text,
  notes        text,
  game_number  integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists games_date_time_idx on public.games (date_time);
create index if not exists games_venue_idx     on public.games (venue_id);
create index if not exists games_status_idx    on public.games (status);

-- ============================================================================
-- assignments  (one row per official position on a game)
-- ============================================================================
create table if not exists public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.games(id) on delete cascade,
  official_id         uuid not null references public.profiles(id) on delete cascade,
  position            text not null
                      check (position in ('REF1','REF2','LINE1','LINE2','SUPERVISOR')),
  status              text not null default 'PENDING'
                      check (status in ('PENDING','CONFIRMED','REJECTED','CANCELLED')),
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (game_id, position)
);

create index if not exists assignments_game_idx     on public.assignments (game_id);
create index if not exists assignments_official_idx on public.assignments (official_id);
create index if not exists assignments_status_idx   on public.assignments (status);

-- ============================================================================
-- settings  (flexible key/JSON value store)
--   Stores JSON values directly using jsonb for type-safe queries.
-- ============================================================================
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'certification_levels',
      'league_qualifications',
      'venues',
      'profiles',
      'games',
      'assignments',
      'settings'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%I_updated_at on public.%I;', t, t
    );
    execute format(
      'create trigger trg_%I_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();', t, t
    );
  end loop;
end;
$$;
