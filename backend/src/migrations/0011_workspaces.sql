-- =============================================================================
-- WhistleOps — Workspaces (0011)
-- Multi-league / association / province org model.
-- Idempotent where possible. Run after 0010.
-- =============================================================================

-- ── workspaces ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  type                TEXT NOT NULL
                      CHECK (type IN ('province', 'association', 'league', 'tournament')),
  parent_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS workspaces_parent_idx ON public.workspaces (parent_workspace_id);
CREATE INDEX IF NOT EXISTS workspaces_type_idx ON public.workspaces (type);

-- ── workspace_members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL
                CHECK (role IN ('ADMIN', 'ASSIGNOR', 'FINANCE', 'OFFICIAL', 'SUPERVISOR')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, profile_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx
  ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_profile_idx
  ON public.workspace_members (profile_id);

-- ── Default province workspace + backfill ─────────────────────────────────────
INSERT INTO public.workspaces (id, name, slug, type)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Hockey New Brunswick',
  'hockey-nb',
  'province'
)
ON CONFLICT (slug) DO NOTHING;

-- ── workspace_id on scoped tables ─────────────────────────────────────────────
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.league_qualifications
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Settings: migrate from key-only PK to (workspace_id, key)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.games
SET workspace_id = '00000000-0000-4000-8000-000000000001'
WHERE workspace_id IS NULL;

UPDATE public.venues
SET workspace_id = '00000000-0000-4000-8000-000000000001'
WHERE workspace_id IS NULL;

UPDATE public.league_qualifications
SET workspace_id = '00000000-0000-4000-8000-000000000001'
WHERE workspace_id IS NULL;

UPDATE public.availability
SET workspace_id = '00000000-0000-4000-8000-000000000001'
WHERE workspace_id IS NULL;

UPDATE public.settings
SET workspace_id = '00000000-0000-4000-8000-000000000001'
WHERE workspace_id IS NULL;

-- Backfill workspace_members from existing profiles (global role → membership)
INSERT INTO public.workspace_members (workspace_id, profile_id, role)
SELECT '00000000-0000-4000-8000-000000000001', p.id, p.role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = '00000000-0000-4000-8000-000000000001'
    AND wm.profile_id = p.id
);

-- NOT NULL after backfill
ALTER TABLE public.games
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.venues
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.league_qualifications
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.availability
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.settings
  ALTER COLUMN workspace_id SET NOT NULL;

-- Replace settings primary key
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE public.settings ADD PRIMARY KEY (workspace_id, key);

-- league_name unique per workspace (drop global unique if present)
ALTER TABLE public.league_qualifications
  DROP CONSTRAINT IF EXISTS league_qualifications_league_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS league_qualifications_workspace_league_idx
  ON public.league_qualifications (workspace_id, league_name);

-- availability unique per official per date per workspace
ALTER TABLE public.availability
  DROP CONSTRAINT IF EXISTS availability_official_id_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS availability_workspace_official_date_idx
  ON public.availability (workspace_id, official_id, date);

CREATE INDEX IF NOT EXISTS games_workspace_idx ON public.games (workspace_id);
CREATE INDEX IF NOT EXISTS venues_workspace_idx ON public.venues (workspace_id);
CREATE INDEX IF NOT EXISTS settings_workspace_idx ON public.settings (workspace_id);

-- updated_at triggers for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_workspaces_updated_at'
  ) THEN
    CREATE TRIGGER trg_workspaces_updated_at
      BEFORE UPDATE ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_workspace_members_updated_at'
  ) THEN
    CREATE TRIGGER trg_workspace_members_updated_at
      BEFORE UPDATE ON public.workspace_members
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
