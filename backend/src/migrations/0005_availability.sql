-- Availability table: per-official per-date morning/afternoon/evening slots
CREATE TABLE IF NOT EXISTS availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  morning       BOOLEAN NOT NULL DEFAULT FALSE,
  afternoon     BOOLEAN NOT NULL DEFAULT FALSE,
  evening       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (official_id, date)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_availability_updated_at();

-- RLS: officials can only read/write their own rows
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officials manage own availability"
  ON availability
  FOR ALL
  USING (
    official_id = (
      SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    official_id = (
      SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Admins can read all availability
CREATE POLICY "Admins read all availability"
  ON availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
