import {
  addDaysYmd,
  formatDayLabel,
  formatDayLabelShort,
  formatWeekRange,
  getMondayOfWeek,
  getWeekDates,
  todayYmd,
  toYmdFromDate,
} from "@/lib/atlanticTime";

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

/** @deprecated Use toYmdFromDate */
export const toYMD = toYmdFromDate;

export {
  toYmdFromDate,
  todayYmd,
  getMondayOfWeek,
  getWeekDates,
  formatDayLabel,
  formatDayLabelShort,
  formatWeekRange,
  addDaysYmd,
};

export function slotsToHoursMap(
  slots: Array<{ date: string; time_slots?: number[] | null }>
): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const s of slots) {
    m.set(s.date, new Set(s.time_slots ?? []));
  }
  return m;
}
