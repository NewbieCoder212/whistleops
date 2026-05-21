import { WORKSPACE_TIMEZONE } from "./availabilityMatch";

const DEFAULT_TZ = WORKSPACE_TIMEZONE;

function partsInTimezone(
  instant: Date,
  timeZone: string
): { date: string; time: string } | null {
  if (Number.isNaN(instant.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function dayDiffMs(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!);
}

/** Build UTC ISO from YYYY-MM-DD + HH:MM in workspace timezone (Atlantic). */
export function buildGameDateTimeIso(
  date: string,
  time: string,
  timeZone = DEFAULT_TZ
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
