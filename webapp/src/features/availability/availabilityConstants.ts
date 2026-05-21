export const MORNING_HOURS = [7, 8, 9, 10, 11];
export const AFTERNOON_HOURS = [12, 13, 14, 15, 16];
export const EVENING_HOURS = [17, 18, 19, 20, 21, 22, 23, 0];
export const ALL_HOURS = [...MORNING_HOURS, ...AFTERNOON_HOURS, ...EVENING_HOURS];

export const PERIODS = [
  { label: "Morning", hours: MORNING_HOURS },
  { label: "Afternoon", hours: AFTERNOON_HOURS },
  { label: "Evening", hours: EVENING_HOURS },
] as const;

export function displayHour(h: number): string {
  if (h === 0) return "12";
  if (h <= 12) return String(h);
  return String(h - 12);
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toYMD(d);
  });
}

export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const mo = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const su = sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${mo} – ${su}, ${sunday.getFullYear()}`;
}

export function slotsToHoursMap(
  slots: Array<{ date: string; time_slots?: number[] | null }>
): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const s of slots) {
    m.set(s.date, new Set(s.time_slots ?? []));
  }
  return m;
}
