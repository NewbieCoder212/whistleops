import { serviceDb } from "../db";

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Venue IDs and game IDs tied to a zone (same rules as assign board). */
export async function loadZoneGameFilter(
  workspaceId: string,
  zoneId: string
): Promise<{ zoneVenueIds: Set<string>; gameIds: Set<string> }> {
  const db = serviceDb();

  const { data: zoneVenues, error: venueErr } = await db
    .from("venues")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("zone_id", zoneId);
  if (venueErr) throw venueErr;

  const zoneVenueIds = new Set((zoneVenues ?? []).map((v) => v.id as string));

  const { data: games, error: gamesErr } = await db
    .from("games")
    .select("id, venue_id, venue:venues(zone_id)")
    .eq("workspace_id", workspaceId);
  if (gamesErr) throw gamesErr;

  const gameIds = new Set<string>();
  for (const g of games ?? []) {
    const venueId = g.venue_id as string | null | undefined;
    if (venueId && zoneVenueIds.has(venueId)) {
      gameIds.add(g.id as string);
      continue;
    }
    const venue = unwrapOne(
      g.venue as { zone_id: string | null } | { zone_id: string | null }[] | null
    );
    if (venue?.zone_id === zoneId) gameIds.add(g.id as string);
  }

  return { zoneVenueIds, gameIds };
}

export type GameVenueZoneSnap = {
  venue_id: string | null;
  venue: { zone_id: string | null } | null;
};

export function gameMatchesZoneFilter(
  game: GameVenueZoneSnap,
  zoneId: string | undefined,
  zoneVenueIds: Set<string> | null
): boolean {
  if (!zoneId || !zoneVenueIds) return true;
  const venueId = game.venue_id;
  if (venueId && zoneVenueIds.has(venueId)) return true;
  const venue = unwrapOne(
    game.venue as { zone_id: string | null } | { zone_id: string | null }[] | null
  );
  return venue?.zone_id === zoneId;
}
