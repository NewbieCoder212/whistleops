-- =============================================================================
-- Seed default certification levels.
-- Edit names/sort_order to match your jurisdiction.
-- =============================================================================
insert into public.certification_levels (name, sort_order) values
  ('Level 1', 10),
  ('Level 2', 20),
  ('Level 3', 30),
  ('Level 4', 40),
  ('Level 5', 50),
  ('Level 6', 60)
on conflict (name) do nothing;
