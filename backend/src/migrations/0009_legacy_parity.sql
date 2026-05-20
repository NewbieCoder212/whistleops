-- WhistleOps — Legacy parity (0009)
-- venues.assignable, incident_reports table

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.venues.assignable IS
  'When FALSE, venue is hidden from assignment UI and game CSV import auto-create.';

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  submitted_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  league_type   TEXT,
  league_tier   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_reports_game_idx ON public.incident_reports (game_id);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_reports_select_auth" ON public.incident_reports;
CREATE POLICY "incident_reports_select_auth"
  ON public.incident_reports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "incident_reports_insert_auth" ON public.incident_reports;
CREATE POLICY "incident_reports_insert_auth"
  ON public.incident_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);
