import { serviceDb } from "../db";
import type { PayRatesMatrix } from "../types";
import { DEFAULT_PAY_RATES_MATRIX, parsePayRates } from "./payCalculation";

export type ZonePayRatesSource = "zone" | "workspace_default";

export async function loadWorkspaceDefaultPayRates(
  workspaceId: string
): Promise<PayRatesMatrix> {
  const { data } = await serviceDb()
    .from("settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "pay_rates")
    .maybeSingle();
  return parsePayRates(data?.value ?? DEFAULT_PAY_RATES_MATRIX);
}

export async function loadZonePayRatesRow(
  workspaceId: string,
  zoneId: string
): Promise<{ matrix: PayRatesMatrix; source: ZonePayRatesSource }> {
  const { data } = await serviceDb()
    .from("zone_pay_rates")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("zone_id", zoneId)
    .maybeSingle();

  if (data?.value) {
    return { matrix: parsePayRates(data.value), source: "zone" };
  }

  const fallback = await loadWorkspaceDefaultPayRates(workspaceId);
  return { matrix: fallback, source: "workspace_default" };
}

/** Pay rates for a game based on venue zone; falls back to workspace default when zone unknown. */
export async function loadPayRatesForVenueZone(
  workspaceId: string,
  venueZoneId: string | null | undefined
): Promise<PayRatesMatrix> {
  if (!venueZoneId) {
    return loadWorkspaceDefaultPayRates(workspaceId);
  }
  const { matrix } = await loadZonePayRatesRow(workspaceId, venueZoneId);
  return matrix;
}

export async function upsertZonePayRates(
  workspaceId: string,
  zoneId: string,
  matrix: PayRatesMatrix
): Promise<void> {
  const { error } = await serviceDb()
    .from("zone_pay_rates")
    .upsert(
      {
        workspace_id: workspaceId,
        zone_id: zoneId,
        value: matrix,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,zone_id" }
    );
  if (error) throw error;
}

export async function copyWorkspaceDefaultToZone(
  workspaceId: string,
  zoneId: string
): Promise<PayRatesMatrix> {
  const matrix = await loadWorkspaceDefaultPayRates(workspaceId);
  await upsertZonePayRates(workspaceId, zoneId, matrix);
  return matrix;
}
