/** Hour buckets aligned with official availability UI. */
export const MORNING_HOURS = [7, 8, 9, 10, 11];
export const AFTERNOON_HOURS = [12, 13, 14, 15, 16];
export const EVENING_HOURS = [17, 18, 19, 20, 21, 22, 23, 0];
export const BOARD_HOURS = [...MORNING_HOURS, ...AFTERNOON_HOURS, ...EVENING_HOURS];

/** All schedule/game calendar logic uses Atlantic (Moncton) time. */
export const WORKSPACE_TIMEZONE = "America/Moncton";
const DEFAULT_TZ = WORKSPACE_TIMEZONE;

export type AvailabilityStatus = "available" | "unavailable" | "busy" | "no_submission";

/** Calendar date YYYY-MM-DD in workspace timezone. */
export function dateKeyFromIso(iso: string, timeZone = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Hour 0–23 in workspace timezone. */
export function gameHourFromIso(iso: string, timeZone = DEFAULT_TZ): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value;
  return h != null ? parseInt(h, 10) : new Date(iso).getHours();
}

export function isHourAvailable(timeSlots: number[] | null | undefined, hour: number): boolean {
  if (!timeSlots || timeSlots.length === 0) return false;
  return timeSlots.includes(hour);
}

export function resolveAvailabilityStatus(
  timeSlots: number[] | null | undefined,
  busyHours: number[],
  hour: number
): AvailabilityStatus {
  if (busyHours.includes(hour)) return "busy";
  if (!timeSlots || timeSlots.length === 0) return "no_submission";
  if (timeSlots.includes(hour)) return "available";
  return "unavailable";
}

function addDaysIso(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/**
 * Calendar date for games stored as wall-clock in the ISO string (CSV import uses …T{time}Z).
 * Matches Schedule `toDateKey` when the browser is in Atlantic time and import times are local.
 */
export function storedGameDateKey(iso: string): string {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? dateKeyFromIso(iso);
}

/** Hour 0–23 from the stored wall-clock portion of game date_time. */
export function storedGameHour(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (match) return parseInt(match[1]!, 10);
  return gameHourFromIso(iso);
}

/** DB range for one calendar day; filter rows with storedGameDateKey. */
export function dayQueryBounds(date: string): { start: string; end: string } {
  const prev = addDaysIso(date, -1);
  const next = addDaysIso(date, 1);
  return {
    start: `${prev}T00:00:00.000Z`,
    end: `${next}T23:59:59.999Z`,
  };
}
