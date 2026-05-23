import {
  addDaysYmd,
  buildGameDateTimeIso,
  endOfWeekYmd,
  startOfWeekYmd,
  todayYmd,
} from "@/lib/atlanticTime";

export function todayIso(): string {
  return todayYmd();
}

export function addDaysIso(iso: string, days: number): string {
  return addDaysYmd(iso, days);
}

export function startOfWeekIso(iso: string): string {
  return startOfWeekYmd(iso);
}

export function endOfWeekIso(iso: string): string {
  return endOfWeekYmd(iso);
}

export type ScheduleFilterState = {
  zoneId: string | null;
  leagueType: string | null;
  dateFrom: string;
  dateTo: string;
  unassignedOnly: boolean;
  declinedOnly: boolean;
  /** null = all rinks in the active zone */
  venueIds: string[] | null;
};

export function defaultScheduleFilters(): ScheduleFilterState {
  const from = todayIso();
  return {
    zoneId: null,
    leagueType: null,
    dateFrom: from,
    dateTo: addDaysIso(from, 6),
    unassignedOnly: false,
    declinedOnly: false,
    venueIds: null,
  };
}

export function buildGamesQueryParams(filters: ScheduleFilterState): string {
  const params = new URLSearchParams();
  const start =
    buildGameDateTimeIso(filters.dateFrom, "00:00") ?? `${filters.dateFrom}T00:00:00.000Z`;
  const end =
    buildGameDateTimeIso(filters.dateTo, "23:59") ?? `${filters.dateTo}T23:59:59.999Z`;
  params.set("startDate", start);
  params.set("endDate", end);
  if (filters.zoneId) params.set("zoneId", filters.zoneId);
  if (filters.unassignedOnly) params.set("unassignedOnly", "true");
  return params.toString();
}

const ZONE_PREF_PREFIX = "whistleops_schedule_zone_";

export function loadSavedZoneId(userId: string | undefined): string | null {
  if (!userId || typeof window === "undefined") return null;
  return localStorage.getItem(`${ZONE_PREF_PREFIX}${userId}`);
}

export function saveZonePreference(userId: string | undefined, zoneId: string | null) {
  if (!userId || typeof window === "undefined") return;
  const key = `${ZONE_PREF_PREFIX}${userId}`;
  if (zoneId) localStorage.setItem(key, zoneId);
  else localStorage.removeItem(key);
}

/**
 * Initial zone for schedule/board/finance filters.
 * Non-admins with a profile home zone start there; admins prefer last saved selection.
 */
export function resolveDefaultZoneId(options: {
  userId?: string;
  profileZoneId?: string | null;
  role?: string;
  zoneIds: string[];
}): string | null {
  const { userId, profileZoneId, role, zoneIds } = options;
  if (zoneIds.length === 0) return null;

  const pick = (id: string | null | undefined) =>
    id && zoneIds.includes(id) ? id : null;

  const home = pick(profileZoneId);
  const saved = pick(loadSavedZoneId(userId));
  const first = zoneIds[0] ?? null;

  if (role === "ADMIN") {
    return saved ?? home ?? first;
  }

  if (home) return home;
  return saved ?? first;
}
