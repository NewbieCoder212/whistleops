-- =============================================================================
-- WhistleOps — Payout Approval Flag (0004)
-- Adds payout_approved to assignments so payroll rows can be locked after
-- an admin approves them for export. Run in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- =============================================================================

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS payout_approved BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN assignments.payout_approved IS
  'TRUE once an admin approves the assignment for payroll. '
  'Prevents further status edits and flags the row for CSV ledger export.';
