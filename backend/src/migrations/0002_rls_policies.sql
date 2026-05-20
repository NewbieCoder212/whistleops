-- =============================================================================
-- WhistleOps — Row Level Security templates (0002)
-- These are baseline policies. All backend API access uses the service-role
-- key which bypasses RLS, so these policies primarily protect direct client
-- access from the browser (Supabase JS with the anon key).
--
-- Convention:
--   - is_admin(uid)      returns true if the auth.user has profiles.role = 'ADMIN'
--   - is_self_profile()  returns true if the row's user_id = auth.uid()
-- =============================================================================

-- Helper functions ------------------------------------------------------------
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'ADMIN', false);
$$;

-- Enable RLS ------------------------------------------------------------------
alter table public.certification_levels  enable row level security;
alter table public.league_qualifications enable row level security;
alter table public.venues                enable row level security;
alter table public.profiles              enable row level security;
alter table public.games                 enable row level security;
alter table public.assignments           enable row level security;
alter table public.settings              enable row level security;

-- ============================================================================
-- certification_levels  -- public read, admin write
-- ============================================================================
drop policy if exists "certification_levels_select_all" on public.certification_levels;
create policy "certification_levels_select_all"
  on public.certification_levels for select
  using (true);

drop policy if exists "certification_levels_admin_write" on public.certification_levels;
create policy "certification_levels_admin_write"
  on public.certification_levels for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- league_qualifications -- public read, admin write
-- ============================================================================
drop policy if exists "league_qualifications_select_all" on public.league_qualifications;
create policy "league_qualifications_select_all"
  on public.league_qualifications for select
  using (true);

drop policy if exists "league_qualifications_admin_write" on public.league_qualifications;
create policy "league_qualifications_admin_write"
  on public.league_qualifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- venues -- authenticated read, admin write
-- ============================================================================
drop policy if exists "venues_select_auth" on public.venues;
create policy "venues_select_auth"
  on public.venues for select
  using (auth.role() = 'authenticated');

drop policy if exists "venues_admin_write" on public.venues;
create policy "venues_admin_write"
  on public.venues for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- profiles -- self read/update, admin all
-- ============================================================================
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (public.is_admin() or auth.uid() = user_id);

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
  on public.profiles for delete
  using (public.is_admin());

-- ============================================================================
-- games -- authenticated read, admin write
-- ============================================================================
drop policy if exists "games_select_auth" on public.games;
create policy "games_select_auth"
  on public.games for select
  using (auth.role() = 'authenticated');

drop policy if exists "games_admin_write" on public.games;
create policy "games_admin_write"
  on public.games for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- assignments -- official sees own, admin all
-- ============================================================================
drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own"
  on public.assignments for select
  using (
    public.is_admin()
    or official_id in (select id from public.profiles where user_id = auth.uid())
  );

drop policy if exists "assignments_official_update_own" on public.assignments;
create policy "assignments_official_update_own"
  on public.assignments for update
  using (
    public.is_admin()
    or official_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or official_id in (select id from public.profiles where user_id = auth.uid())
  );

drop policy if exists "assignments_admin_write" on public.assignments;
create policy "assignments_admin_write"
  on public.assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- settings -- authenticated read, admin write
-- ============================================================================
drop policy if exists "settings_select_auth" on public.settings;
create policy "settings_select_auth"
  on public.settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());
