-- ── Zones ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed NB Hockey zones
INSERT INTO zones (name, sort_order) VALUES
  ('Zone 1 - Moncton / Dieppe',       1),
  ('Zone 2 - Saint John',             2),
  ('Zone 3 - Fredericton',            3),
  ('Zone 4 - Miramichi',              4),
  ('Zone 5 - Bathurst / Campbellton', 5),
  ('Zone 6 - Sussex / Sackville',     6),
  ('Zone 7 - Edmundston',             7)
ON CONFLICT DO NOTHING;

-- ── Zone FK on venues ──────────────────────────────────────────────────────────
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- ── Zone FK on profiles ────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- ── League type on games ───────────────────────────────────────────────────────
-- Broad competition tier: Minor | Senior | Adult Rec (free-text to allow future additions)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS league_type TEXT;

-- Also fix the time_slots column from migration 0007 if not yet run
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS time_slots JSONB;
