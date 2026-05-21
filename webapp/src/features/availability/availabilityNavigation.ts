import { addDaysIso } from "@/features/filters/scheduleFilterUtils";
import { buildGameDateTimeIso } from "@/lib/atlanticTime";
import { getMondayOfWeek, getWeekDates, toYmdFromDate } from "./availabilityConstants";

export function mondayOnOrBefore(dateStr: string): Date {
  const anchor =
    buildGameDateTimeIso(dateStr, "12:00") ?? `${dateStr}T12:00:00.000Z`;
  return getMondayOfWeek(new Date(anchor));
}

export function shiftWeekBlockDates(
  focusDate: string,
  weekMonday: Date,
  deltaWeeks: number
): { focusDate: string; weekMonday: Date } {
  const weekDates = getWeekDates(weekMonday);
  const dayIndex = weekDates.indexOf(focusDate);
  const nextMondayStr = addDaysIso(toYmdFromDate(weekMonday), deltaWeeks * 7);
  const nextMonday = mondayOnOrBefore(nextMondayStr);
  const newWeek = getWeekDates(nextMonday);
  return {
    weekMonday: nextMonday,
    focusDate: newWeek[dayIndex >= 0 ? dayIndex : 0]!,
  };
}
