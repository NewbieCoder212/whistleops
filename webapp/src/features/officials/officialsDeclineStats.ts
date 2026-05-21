import { addDaysIso, todayIso } from "@/features/filters/scheduleFilterUtils";
import type { DeclineStatsParams } from "@/lib/resources";

export type DeclinePeriodMode = "season" | "custom";

export type DeclinePeriodState = {
  mode: DeclinePeriodMode;
  seasonYear: number;
  dateFrom: string;
  dateTo: string;
};

/** NB season start year (Sept–Aug): e.g. May 2026 → 2025 for 2025–26. */
export function currentNBSeasonStartYear(): number {
  const d = new Date();
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

export function defaultDeclinePeriod(): DeclinePeriodState {
  const y = currentNBSeasonStartYear();
  const from = todayIso();
  return {
    mode: "season",
    seasonYear: y,
    dateFrom: addDaysIso(from, -30),
    dateTo: from,
  };
}

export function seasonLabel(startYear: number): string {
  const end = startYear + 1;
  return `${startYear}–${String(end).slice(2)}`;
}

export function declineStatsQueryParams(period: DeclinePeriodState): DeclineStatsParams {
  if (period.mode === "custom") {
    return { date_from: period.dateFrom, date_to: period.dateTo };
  }
  return { year: String(period.seasonYear) };
}
