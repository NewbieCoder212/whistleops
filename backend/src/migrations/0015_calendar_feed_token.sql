-- =============================================================================
-- WhistleOps — Calendar feed token (0015)
-- Per official per workspace token for webcal/ICS subscription.
-- Run after 0014 in Supabase SQL editor.
-- =============================================================================

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS calendar_feed_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS workspace_members_calendar_feed_token_idx
  ON public.workspace_members (calendar_feed_token)
  WHERE calendar_feed_token IS NOT NULL;

-- Backfill existing memberships with opaque tokens
UPDATE public.workspace_members
SET calendar_feed_token = encode(gen_random_bytes(32), 'hex')
WHERE calendar_feed_token IS NULL;
