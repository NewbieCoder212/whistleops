-- =============================================================================
-- WhistleOps — Per-zone finance (0016)
-- Zone-specific pay rate matrices; provincial default remains settings.pay_rates.
-- Run in Supabase SQL editor after 0015.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.zone_pay_rates (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  zone_id      UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  value        JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, zone_id)
);

CREATE INDEX IF NOT EXISTS zone_pay_rates_workspace_idx
  ON public.zone_pay_rates (workspace_id);

-- Backfill all HNB zones from current provincial pay_rates (or empty matrix skipped)
INSERT INTO public.zone_pay_rates (workspace_id, zone_id, value, updated_at)
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  z.id,
  COALESCE(
    (SELECT s.value FROM public.settings s
     WHERE s.workspace_id = '00000000-0000-4000-8000-000000000001'
       AND s.key = 'pay_rates'
     LIMIT 1),
    '{"default":{"REF1":75,"REF2":65,"LINE1":55,"LINE2":55,"SUPERVISOR":85,"cost_per_km":0.42}}'::jsonb
  ),
  NOW()
FROM public.zones z
WHERE z.id IN (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000108',
  '00000000-0000-4000-8000-000000000109'
)
ON CONFLICT (workspace_id, zone_id) DO NOTHING;

ALTER TABLE public.zone_pay_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zone_pay_rates_select_auth" ON public.zone_pay_rates;
CREATE POLICY "zone_pay_rates_select_auth"
  ON public.zone_pay_rates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "zone_pay_rates_service_write" ON public.zone_pay_rates;
CREATE POLICY "zone_pay_rates_service_write"
  ON public.zone_pay_rates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
