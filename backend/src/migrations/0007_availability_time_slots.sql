-- Add individual hour-level time slots to availability.
-- time_slots stores an array of hours (0–23) that the official is available.
-- The existing morning/afternoon/evening columns are kept as derived summaries.
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS time_slots JSONB;
