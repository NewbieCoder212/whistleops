-- Add ASSIGNOR as a valid role in the profiles table
-- Existing check constraint must be dropped and re-created.

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('ADMIN', 'ASSIGNOR', 'FINANCE', 'OFFICIAL', 'SUPERVISOR'));
