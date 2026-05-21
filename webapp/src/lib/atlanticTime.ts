/**
 * All schedule, game, and availability calendar logic uses Atlantic (Moncton) time.
 * Game `date_time` values are stored as UTC instants; always convert for display and forms.
 */
export const ATLANTIC_TIMEZONE = "America/Moncton";

/** @deprecated Use ATLANTIC_TIMEZONE */
export const GAME_SCHEDULE_TIMEZONE = ATLANTIC_TIMEZONE;

type YmdParts = { year: string; month: string; day: string; hour?: string; minute?: string };

function formatParts(
  instant: Date,
  timeZone: string,
  includeTime: boolean
): YmdParts | null {
  if (Number.isNaN(instant.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false as const }
      : {}),
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    ...(includeTime ? { hour: get("hour"), minute: get("minute") } : {}),
  };
}

export function toYmdFromInstant(
  instant: Date,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const p = formatParts(instant, timeZone, false);
  if (!p) return "";
  return `${p.year}-${p.month}-${p.day}`;
}

/** Calendar today in Atlantic (YYYY-MM-DD). */
export function todayYmd(timeZone = ATLANTIC_TIMEZONE): string {
  return toYmdFromInstant(new Date(), timeZone);
}

/** NB season start year (Sept–Aug), e.g. May 2026 → 2025 for 2025–26. */
export function currentNBSeasonStartYear(timeZone = ATLANTIC_TIMEZONE): number {
  const p = formatParts(new Date(), timeZone, false);
  if (!p) return new Date().getFullYear();
  const y = parseInt(p.year, 10);
  const m = parseInt(p.month, 10) - 1;
  return m >= 8 ? y : y - 1;
}

/** @deprecated Prefer todayYmd */
export function todayIso(): string {
  return todayYmd();
}

/** Game/list date key from stored ISO. */
export function toDateKeyFromIso(
  isoStr: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) {
    const m = isoStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return m?.[1] ?? "";
  }
  return toYmdFromInstant(d, timeZone);
}

/** Hour bucket 0–23 in Atlantic for availability / assign board. */
export function gameHourFromIso(
  iso: string,
  timeZone = ATLANTIC_TIMEZONE
): number {
  const d = new Date(iso);
  const p = formatParts(d, timeZone, true);
  if (!p?.hour) return 0;
  return parseInt(p.hour, 10);
}

export function toYmdFromDate(d: Date, timeZone = ATLANTIC_TIMEZONE): string {
  return toYmdFromInstant(d, timeZone);
}

/** @deprecated Use toYmdFromDate — kept for availability calendar call sites */
export function toYMD(d: Date): string {
  return toYmdFromDate(d);
}

export function addDaysYmd(
  ymd: string,
  days: number,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const anchor = buildGameDateTimeIso(ymd, "12:00", timeZone);
  if (!anchor) return ymd;
  const ms = new Date(anchor).getTime() + days * 86_400_000;
  return toYmdFromInstant(new Date(ms), timeZone);
}

export function startOfWeekYmd(ymd: string, timeZone = ATLANTIC_TIMEZONE): string {
  const anchor = buildGameDateTimeIso(ymd, "12:00", timeZone);
  if (!anchor) return ymd;
  const d = new Date(anchor);
  const p = formatParts(d, timeZone, false);
  if (!p) return ymd;
  const noon = buildGameDateTimeIso(`${p.year}-${p.month}-${p.day}`, "12:00", timeZone);
  if (!noon) return ymd;
  const local = new Date(noon);
  const dowFmt = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  const dow = dowFmt.format(local);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const dayNum = map[dow] ?? 1;
  const diff = dayNum === 0 ? -6 : 1 - dayNum;
  return addDaysYmd(toYmdFromInstant(local, timeZone), diff, timeZone);
}

export function endOfWeekYmd(ymd: string, timeZone = ATLANTIC_TIMEZONE): string {
  return addDaysYmd(startOfWeekYmd(ymd, timeZone), 6, timeZone);
}

export function getMondayOfWeekYmd(
  ymd: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  return startOfWeekYmd(ymd, timeZone);
}

export function getMondayOfWeek(date: Date, timeZone = ATLANTIC_TIMEZONE): Date {
  const ymd = getMondayOfWeekYmd(toYmdFromDate(date, timeZone), timeZone);
  const iso = buildGameDateTimeIso(ymd, "12:00", timeZone);
  return iso ? new Date(iso) : date;
}

export function getWeekDates(monday: Date, timeZone = ATLANTIC_TIMEZONE): string[] {
  const start = toYmdFromDate(monday, timeZone);
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i, timeZone));
}

export function formatGameTime(
  isoStr: string,
  timeZone = ATLANTIC_TIMEZONE
): { timeStr: string; dayAbbr: string } {
  const d = new Date(isoStr);
  const timeStr = d.toLocaleTimeString("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dayAbbr = d.toLocaleDateString("en-CA", { timeZone, weekday: "short" });
  return { timeStr, dayAbbr };
}

export function formatGameDateTime(
  isoStr: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString("en-CA", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatGameDateShort(
  isoStr: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString("en-CA", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDayLabelShort(
  dateStr: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const iso = buildGameDateTimeIso(dateStr, "12:00", timeZone);
  if (!iso) return dateStr;
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone,
    weekday: "short",
    day: "numeric",
  });
}

export function formatDayLabel(
  dateStr: string,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const iso = buildGameDateTimeIso(dateStr, "12:00", timeZone);
  if (!iso) return dateStr;
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatWeekRange(
  monday: Date,
  timeZone = ATLANTIC_TIMEZONE
): string {
  const start = toYmdFromDate(monday, timeZone);
  const end = addDaysYmd(start, 6, timeZone);
  const startIso = buildGameDateTimeIso(start, "12:00", timeZone);
  const endIso = buildGameDateTimeIso(end, "12:00", timeZone);
  if (!startIso || !endIso) return "";
  const mo = new Date(startIso).toLocaleDateString("en-CA", {
    timeZone,
    month: "short",
    day: "numeric",
  });
  const su = new Date(endIso).toLocaleDateString("en-CA", {
    timeZone,
    month: "short",
    day: "numeric",
  });
  const year = new Date(endIso).toLocaleDateString("en-CA", {
    timeZone,
    year: "numeric",
  });
  return `${mo} – ${su}, ${year}`;
}

function dayDiffMs(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!);
}

function partsInTimezone(
  instant: Date,
  timeZone: string
): { date: string; time: string } | null {
  const p = formatParts(instant, timeZone, true);
  if (!p?.hour || !p.minute) return null;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

/** Parse stored game ISO into date + time for forms (Atlantic). */
export function parseGameDateTimeIso(
  iso: string,
  timeZone = ATLANTIC_TIMEZONE
): { date: string; time: string } | null {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    return partsInTimezone(d, timeZone);
  }
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  return { date: match[1]!, time: `${match[2]}:${match[3]}` };
}

/** Build UTC ISO from calendar date + time in Atlantic. */
export function buildGameDateTimeIso(
  date: string,
  time: string,
  timeZone = ATLANTIC_TIMEZONE
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timeParts = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeParts) return null;
  const hour = timeParts[1]!.padStart(2, "0");
  const minute = timeParts[2]!;
  const targetTime = `${hour}:${minute}`;

  const [y, mo, d] = date.split("-").map(Number);
  let utcMs = Date.UTC(y!, mo! - 1, d!, parseInt(hour, 10), parseInt(minute, 10), 0);

  for (let i = 0; i < 5; i++) {
    const got = partsInTimezone(new Date(utcMs), timeZone);
    if (!got) return null;
    if (got.date === date && got.time === targetTime) {
      return new Date(utcMs).toISOString();
    }
    const [gh, gm] = got.time.split(":").map(Number);
    const [th, tm] = targetTime.split(":").map(Number);
    const deltaMin =
      Math.round(dayDiffMs(got.date, date) / (60 * 1000)) + (th! * 60 + tm! - (gh! * 60 + gm!));
    utcMs += deltaMin * 60 * 1000;
  }

  return null;
}
