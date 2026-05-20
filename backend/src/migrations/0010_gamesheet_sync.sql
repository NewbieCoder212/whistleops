-- WhistleOps — Gamesheet webhook sync (0010)
-- External game IDs, scores, and webhook audit log.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS gamesheet_external_id TEXT,
  ADD COLUMN IF NOT EXISTS home_score INTEGER,
  ADD COLUMN IF NOT EXISTS away_score INTEGER,
  ADD COLUMN IF NOT EXISTS gamesheet_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gamesheet_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS games_gamesheet_external_id_idx
  ON public.games (gamesheet_external_id)
  WHERE gamesheet_external_id IS NOT NULL;

COMMENT ON COLUMN public.games.gamesheet_external_id IS
  'GameSheet Stats external game identifier for webhook matching.';
COMMENT ON COLUMN public.games.gamesheet_synced_at IS
  'Timestamp of last successful Gamesheet webhook apply.';
COMMENT ON COLUMN public.games.gamesheet_status IS
  'Raw status string from the last Gamesheet webhook payload.';

CREATE TABLE IF NOT EXISTS public.gamesheet_webhook_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload               JSONB NOT NULL,
  event_type            TEXT,
  gamesheet_external_id TEXT,
  game_id               UUID REFERENCES public.games(id) ON DELETE SET NULL,
  matched               BOOLEAN NOT NULL DEFAULT FALSE,
  error                 TEXT,
  processed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS gamesheet_webhook_events_received_at_idx
  ON public.gamesheet_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS gamesheet_webhook_events_game_id_idx
  ON public.gamesheet_webhook_events (game_id)
  WHERE game_id IS NOT NULL;

ALTER TABLE public.gamesheet_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no authenticated policies needed for webhook audit.
