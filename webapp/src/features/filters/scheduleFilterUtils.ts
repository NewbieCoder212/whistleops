export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfWeekIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function endOfWeekIso(iso: string): string {
  return addDaysIso(startOfWeekIso(iso), 6);
}

export type ScheduleFilterState = {
  zoneId: string | null;
  leagueType: string | null;
  dateFrom: string;
  dateTo: string;
  unassignedOnly: boolean;
  declinedOnly: boolean;
};

export function defaultScheduleFilters(): ScheduleFilterState {
  const from = todayIso();
  return {
    zoneId: null,
    leagueType: null,
    dateFrom: from,
    dateTo: addDaysIso(from, 7),
    unassignedOnly: false,
    declinedOnly: false,
  };
}

export function buildGamesQueryParams(filters: ScheduleFilterState): string {
  const params = new URLSearchParams();
  params.set("startDate", `${filters.dateFrom}T00:00:00.000Z`);
  params.set("endDate", `${filters.dateTo}T23:59:59.999Z`);
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
