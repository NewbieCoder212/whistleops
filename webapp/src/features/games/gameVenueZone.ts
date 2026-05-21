import type { Venue } from "@shared/types";

/** Rinks shown in add/edit game when a schedule zone filter is active. */
export function filterVenuesForScheduleZone(
  venues: Venue[],
  scheduleZoneId: string | null,
  includeVenueId?: string | null
): Venue[] {
  if (!scheduleZoneId) return venues;
  const filtered = venues.filter((v) => v.zone_id === scheduleZoneId);
  if (includeVenueId && !filtered.some((v) => v.id === includeVenueId)) {
    const extra = venues.find((v) => v.id === includeVenueId);
    if (extra) return [...filtered, extra];
  }
  return filtered;
}

/** Returns an error message to show via toast, or null if OK. */
export function validateVenueForScheduleZone(
  venues: Venue[],
  venueId: string,
  scheduleZoneId: string | null
): string | null {
  if (!scheduleZoneId) return null;
  if (!venueId) {
    return "Select a rink in this zone so the game appears on your filtered schedule.";
  }
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) return "Selected rink not found.";
  if (!venue.zone_id) {
    return "This rink has no zone assigned. Set its zone under Configuration → Assignable rinks.";
  }
  if (venue.zone_id !== scheduleZoneId) {
    return "Selected rink is not in the active zone.";
  }
  return null;
}
