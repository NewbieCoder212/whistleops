-- =============================================================================
-- WhistleOps — Workspace RLS (0012)
-- Run after 0011_workspaces.sql
-- =============================================================================

-- Helper: profile id for current auth user
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: is member of workspace with staff role
CREATE OR REPLACE FUNCTION public.is_workspace_staff(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ws_id
      AND wm.profile_id = public.current_profile_id()
      AND wm.role IN ('ADMIN', 'ASSIGNOR', 'FINANCE', 'SUPERVISOR')
  );
$$;

-- Helper: is member of workspace (any role)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ws_id
      AND wm.profile_id = public.current_profile_id()
  );
$$;

-- workspaces: members can read their workspaces
DROP POLICY IF EXISTS "workspaces_member_select" ON public.workspaces;
CREATE POLICY "workspaces_member_select"
  ON public.workspaces FOR SELECT
  USING (
    public.is_workspace_member(id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "workspaces_admin_write" ON public.workspaces;
CREATE POLICY "workspaces_admin_write"
  ON public.workspaces FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- workspace_members
DROP POLICY IF EXISTS "workspace_members_member_select" ON public.workspace_members;
CREATE POLICY "workspace_members_member_select"
  ON public.workspace_members FOR SELECT
  USING (
    public.is_workspace_member(workspace_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "workspace_members_staff_write" ON public.workspace_members;
CREATE POLICY "workspace_members_staff_write"
  ON public.workspace_members FOR ALL
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin())
  WITH CHECK (public.is_workspace_staff(workspace_id) OR public.is_admin());

-- games: scoped by workspace membership
DROP POLICY IF EXISTS "games_select_all" ON public.games;
CREATE POLICY "games_workspace_select"
  ON public.games FOR SELECT
  USING (public.is_workspace_member(workspace_id) OR public.is_admin());

DROP POLICY IF EXISTS "games_admin_write" ON public.games;
CREATE POLICY "games_workspace_staff_write"
  ON public.games FOR ALL
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin())
  WITH CHECK (public.is_workspace_staff(workspace_id) OR public.is_admin());

-- venues
DROP POLICY IF EXISTS "venues_select_all" ON public.venues;
CREATE POLICY "venues_workspace_select"
  ON public.venues FOR SELECT
  USING (public.is_workspace_member(workspace_id) OR public.is_admin());

DROP POLICY IF EXISTS "venues_admin_write" ON public.venues;
CREATE POLICY "venues_workspace_staff_write"
  ON public.venues FOR ALL
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin())
  WITH CHECK (public.is_workspace_staff(workspace_id) OR public.is_admin());

-- league_qualifications
DROP POLICY IF EXISTS "league_qualifications_select_all" ON public.league_qualifications;
CREATE POLICY "league_qualifications_workspace_select"
  ON public.league_qualifications FOR SELECT
  USING (public.is_workspace_member(workspace_id) OR public.is_admin());

DROP POLICY IF EXISTS "league_qualifications_admin_write" ON public.league_qualifications;
CREATE POLICY "league_qualifications_workspace_staff_write"
  ON public.league_qualifications FOR ALL
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin())
  WITH CHECK (public.is_workspace_staff(workspace_id) OR public.is_admin());

-- settings
DROP POLICY IF EXISTS "settings_select_all" ON public.settings;
CREATE POLICY "settings_workspace_select"
  ON public.settings FOR SELECT
  USING (public.is_workspace_member(workspace_id) OR public.is_admin());

DROP POLICY IF EXISTS "settings_admin_write" ON public.settings;
CREATE POLICY "settings_workspace_staff_write"
  ON public.settings FOR ALL
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin())
  WITH CHECK (public.is_workspace_staff(workspace_id) OR public.is_admin());

-- availability: official owns row in workspace; staff can read all in workspace
DROP POLICY IF EXISTS "Officials manage own availability" ON public.availability;
CREATE POLICY "availability_official_own"
  ON public.availability FOR ALL
  USING (
    official_id = public.current_profile_id()
    AND public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    official_id = public.current_profile_id()
    AND public.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Admins read all availability" ON public.availability;
CREATE POLICY "availability_workspace_staff_read"
  ON public.availability FOR SELECT
  USING (public.is_workspace_staff(workspace_id) OR public.is_admin());
