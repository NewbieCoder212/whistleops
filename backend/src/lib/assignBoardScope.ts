import { serviceDb } from "../db";
import { dateKeyFromIso, dayQueryBounds } from "./availabilityMatch";

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type VenueSnap = {
  id?: string;
  zone_id?: string | null;
};

/**
 * Game IDs on `date` in `zoneId` for a workspace (same rules as GET /api/assign-board).
 */
export async function resolveAssignBoardGameIds(params: {
  workspaceId: string;
  date: string;
  zoneId: string;
  leagueType?: string;
}): Promise<{ gameIds: string[]; zoneName: string }> {
  const { workspaceId, date, zoneId, leagueType } = params;
  const db = serviceDb();

  const { data: zone, error: zoneErr } = await db
    .from("zones")
    .select("id, name")
    .eq("id", zoneId)
    .maybeSingle();
  if (zoneErr) throw zoneErr;
  if (!zone) {
    const err = new Error("Zone not found") as Error & { code?: string };
    err.code = "NOT_FOUND";
    throw err;
  }

  const { data: zoneVenues, error: zoneVenueErr } = await db
    .from("venues")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("zone_id", zoneId);
  if (zoneVenueErr) throw zoneVenueErr;
  const zoneVenueIds = new Set((zoneVenues ?? []).map((v) => v.id as string));

  const bounds = dayQueryBounds(date);

  let gamesQ = db
    .from("games")
    .select("id, date_time, venue_id, venue:venues(id, zone_id)")
    .eq("workspace_id", workspaceId)
    .gte("date_time", bounds.start)
    .lte("date_time", bounds.end);

  if (leagueType) gamesQ = gamesQ.eq("league_type", leagueType);

  const { data: gameRows, error: gamesErr } = await gamesQ;
  if (gamesErr) throw gamesErr;

  const gameIds: string[] = [];

  for (const g of gameRows ?? []) {
    if (dateKeyFromIso(String(g.date_time)) !== date) continue;
    const venueId = g.venue_id as string | null | undefined;
    if (venueId && zoneVenueIds.has(venueId)) {
      gameIds.push(g.id as string);
      continue;
    }
    const venue = unwrapOne(g.venue as VenueSnap | VenueSnap[] | null);
    if (venue?.zone_id === zoneId) gameIds.push(g.id as string);
  }

  return { gameIds, zoneName: zone.name as string };
}
