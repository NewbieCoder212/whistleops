import type { AvailabilitySlot } from "@shared/types";

export type OverviewHourStatus = "available" | "unavailable" | "no_submission" | "booked";

export type OverviewOfficialRow = {
  official_id: string;
  full_name: string | null;
  email: string;
  zone_id: string | null;
  slots: AvailabilitySlot[];
  /** Hours with DRAFT/PENDING/CONFIRMED assignments, keyed by YYYY-MM-DD */
  booked_hours?: Record<string, number[]>;
};

export function bookedHoursForDate(
  official: Pick<OverviewOfficialRow, "booked_hours">,
  dateStr: string
): Set<number> {
  return new Set(official.booked_hours?.[dateStr] ?? []);
}

export function hoursForDate(
  slots: Array<{ date: string; time_slots?: number[] | null }>,
  dateStr: string
): Set<number> {
  const day = slots.find((s) => s.date === dateStr);
  return new Set(day?.time_slots ?? []);
}

export function hasSubmissionForDate(
  slots: Array<{ date: string; time_slots?: number[] | null }>,
  dateStr: string
): boolean {
  return slots.some((s) => s.date === dateStr);
}

export function resolveOverviewHourStatus(
  official: Pick<OverviewOfficialRow, "slots" | "booked_hours">,
  dateStr: string,
  hour: number
): OverviewHourStatus {
  if (bookedHoursForDate(official, dateStr).has(hour)) return "booked";

  const day = official.slots.find((s) => s.date === dateStr);
  if (!day) return "no_submission";
  const ts = day.time_slots ?? [];
  if (ts.length === 0) return "unavailable";
  return ts.includes(hour) ? "available" : "unavailable";
}

/** Hours marked available in submission, excluding game assignments. */
export function countAvailableHoursOnDate(
  official: Pick<OverviewOfficialRow, "slots" | "booked_hours">,
  dateStr: string
): number {
  const booked = bookedHoursForDate(official, dateStr);
  const avail = hoursForDate(official.slots, dateStr);
  let n = 0;
  for (const h of avail) {
    if (!booked.has(h)) n++;
  }
  return n;
}

export function matrixCellClass(status: OverviewHourStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-500/25 border-emerald-500/40";
    case "booked":
      return "bg-red-500/25 border-red-500/40";
    case "unavailable":
      return "bg-background border-border/60";
    case "no_submission":
      return "bg-muted/50 border-border border-dashed";
  }
}
