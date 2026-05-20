-- =============================================================================
-- WhistleOps — Hockey NB official 9 zones (0013)
-- Replaces legacy 7-zone seed from 0008. Run in Supabase SQL editor.
-- =============================================================================

ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Stable IDs for the 9 provincial zones
INSERT INTO public.zones (id, name, slug, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Zone 1 - Edmundston',       'zone-1-edmundston',       1),
  ('00000000-0000-4000-8000-000000000102', 'Zone 2 - Woodstock',        'zone-2-woodstock',        2),
  ('00000000-0000-4000-8000-000000000103', 'Zone 3 - Fredericton',      'zone-3-fredericton',      3),
  ('00000000-0000-4000-8000-000000000104', 'Zone 4 - Saint John Area',  'zone-4-saint-john',       4),
  ('00000000-0000-4000-8000-000000000105', 'Zone 5 - Moncton Area',     'zone-5-moncton',          5),
  ('00000000-0000-4000-8000-000000000106', 'Zone 6 - Miramichi Area',   'zone-6-miramichi',        6),
  ('00000000-0000-4000-8000-000000000107', 'Zone 7 - Bathurst Area',    'zone-7-bathurst',         7),
  ('00000000-0000-4000-8000-000000000108', 'Zone 8 - Dalhousie Area',   'zone-8-dalhousie',        8),
  ('00000000-0000-4000-8000-000000000109', 'Zone 9 - Caraquet Area',    'zone-9-caraquet',         9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Remap venues from legacy zone names → new zone IDs
UPDATE public.venues v
SET zone_id = CASE
  WHEN z.name ILIKE '%edmundston%' THEN '00000000-0000-4000-8000-000000000101'::uuid
  WHEN z.name ILIKE '%woodstock%' AND z.name NOT ILIKE '%moncton%' THEN '00000000-0000-4000-8000-000000000102'::uuid
  WHEN z.name ILIKE '%fredericton%' THEN '00000000-0000-4000-8000-000000000103'::uuid
  WHEN z.name ILIKE '%saint john%' OR z.name ILIKE '%sussex%' OR z.name ILIKE '%sackville%' THEN '00000000-0000-4000-8000-000000000104'::uuid
  WHEN z.name ILIKE '%moncton%' OR z.name ILIKE '%dieppe%' THEN '00000000-0000-4000-8000-000000000105'::uuid
  WHEN z.name ILIKE '%miramichi%' THEN '00000000-0000-4000-8000-000000000106'::uuid
  WHEN z.name ILIKE '%bathurst%' OR z.name ILIKE '%campbellton%' THEN '00000000-0000-4000-8000-000000000107'::uuid
  WHEN z.name ILIKE '%dalhousie%' THEN '00000000-0000-4000-8000-000000000108'::uuid
  WHEN z.name ILIKE '%caraquet%' THEN '00000000-0000-4000-8000-000000000109'::uuid
  ELSE NULL
END
FROM public.zones z
WHERE v.zone_id = z.id
  AND z.id NOT IN (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000105',
    '00000000-0000-4000-8000-000000000106',
    '00000000-0000-4000-8000-000000000107',
    '00000000-0000-4000-8000-000000000108',
    '00000000-0000-4000-8000-000000000109'
  );

UPDATE public.profiles p
SET zone_id = CASE
  WHEN z.name ILIKE '%edmundston%' THEN '00000000-0000-4000-8000-000000000101'::uuid
  WHEN z.name ILIKE '%woodstock%' AND z.name NOT ILIKE '%moncton%' THEN '00000000-0000-4000-8000-000000000102'::uuid
  WHEN z.name ILIKE '%fredericton%' THEN '00000000-0000-4000-8000-000000000103'::uuid
  WHEN z.name ILIKE '%saint john%' OR z.name ILIKE '%sussex%' OR z.name ILIKE '%sackville%' THEN '00000000-0000-4000-8000-000000000104'::uuid
  WHEN z.name ILIKE '%moncton%' OR z.name ILIKE '%dieppe%' THEN '00000000-0000-4000-8000-000000000105'::uuid
  WHEN z.name ILIKE '%miramichi%' THEN '00000000-0000-4000-8000-000000000106'::uuid
  WHEN z.name ILIKE '%bathurst%' OR z.name ILIKE '%campbellton%' THEN '00000000-0000-4000-8000-000000000107'::uuid
  WHEN z.name ILIKE '%dalhousie%' THEN '00000000-0000-4000-8000-000000000108'::uuid
  WHEN z.name ILIKE '%caraquet%' THEN '00000000-0000-4000-8000-000000000109'::uuid
  ELSE NULL
END
FROM public.zones z
WHERE p.zone_id = z.id
  AND z.id NOT IN (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000105',
    '00000000-0000-4000-8000-000000000106',
    '00000000-0000-4000-8000-000000000107',
    '00000000-0000-4000-8000-000000000108',
    '00000000-0000-4000-8000-000000000109'
  );

-- Remove legacy zone rows (orphans only; FKs already remapped or nulled)
DELETE FROM public.zones
WHERE id NOT IN (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000108',
  '00000000-0000-4000-8000-000000000109'
);

CREATE UNIQUE INDEX IF NOT EXISTS zones_slug_unique ON public.zones (slug)
WHERE slug IS NOT NULL;
