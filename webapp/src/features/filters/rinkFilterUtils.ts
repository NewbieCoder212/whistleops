import type { Venue } from "@shared/types";
import { gameHasOpenSlot, openSlotCount } from "@/features/assignBoard/assignBoardUtils";
import type { AssignBoardGame } from "@shared/types";

export const NO_RINK_VENUE_ID = "__no_rink__";

export type GameWithVenue = {
  venue_id: string | null;
  venue?: { id?: string; name?: string | null } | null;
  date_time?: string;
};

export function getGameVenueId(game: GameWithVenue): string {
  return game.venue_id ?? game.venue?.id ?? NO_RINK_VENUE_ID;
}

export function getGameVenueName(game: GameWithVenue): string {
  if (!game.venue_id && !game.venue?.id) return "No rink assigned";
  return game.venue?.name?.trim() || "Unknown rink";
}

export function venuesInZone(venues: Venue[], zoneId: string): Venue[] {
  return venues
    .filter((v) => v.zone_id === zoneId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterGamesByVenueIds<T extends GameWithVenue>(
  games: T[],
  venueIds: string[] | null
): T[] {
  if (venueIds === null) return games;
  if (venueIds.length === 0) return [];
  const allowed = new Set(venueIds);
  return games.filter((g) => allowed.has(getGameVenueId(g)));
}

export type VenueGameGroup<T extends GameWithVenue> = {
  venueId: string;
  venueName: string;
  games: T[];
};

export function groupGamesByVenue<T extends GameWithVenue>(games: T[]): VenueGameGroup<T>[] {
  const map = new Map<string, VenueGameGroup<T>>();

  for (const game of games) {
    const venueId = getGameVenueId(game);
    const venueName = getGameVenueName(game);
    if (!map.has(venueId)) {
      map.set(venueId, { venueId, venueName, games: [] });
    }
    map.get(venueId)!.games.push(game);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      games: [...group.games].sort((a, b) =>
        (a.date_time ?? "").localeCompare(b.date_time ?? "")
      ),
    }))
    .sort((a, b) => {
      if (a.venueId === NO_RINK_VENUE_ID) return 1;
      if (b.venueId === NO_RINK_VENUE_ID) return -1;
      return a.venueName.localeCompare(b.venueName);
    });
}

export function countGamesByVenue(games: GameWithVenue[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const game of games) {
    const id = getGameVenueId(game);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function countOpenSlotsByVenue(games: AssignBoardGame[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const game of games) {
    const id = getGameVenueId(game);
    const open = openSlotCount(game);
    if (open > 0) {
      counts.set(id, (counts.get(id) ?? 0) + open);
    }
  }
  return counts;
}

export function rinkFilterSummary(
  venueIds: string[] | null,
  totalRinksInZone: number
): string {
  if (totalRinksInZone === 0) return "No rinks";
  if (venueIds === null) return `All rinks (${totalRinksInZone})`;
  if (venueIds.length === 0) return "No rinks selected";
  if (venueIds.length === 1) return "1 rink selected";
  return `${venueIds.length} rinks selected`;
}

export function isRinkFilterActive(
  venueIds: string[] | null,
  _totalRinksInZone: number
): boolean {
  return venueIds !== null && venueIds.length > 0;
}
