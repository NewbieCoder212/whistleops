import type { AvailabilityWindow } from "../types";

export function parseAvailabilityWindow(raw: unknown): AvailabilityWindow {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    open_date: typeof o.open_date === "string" ? o.open_date : null,
    close_date: typeof o.close_date === "string" ? o.close_date : null,
  };
}

export function isDateInAvailabilityWindow(
  date: string,
  window: AvailabilityWindow
): { allowed: boolean; message?: string } {
  if (!window.open_date && !window.close_date) return { allowed: true };

  if (window.open_date && date < window.open_date) {
    return {
      allowed: false,
      message: `Availability opens on ${window.open_date}. You cannot submit for ${date} yet.`,
    };
  }
  if (window.close_date && date > window.close_date) {
    return {
      allowed: false,
      message: `Availability closed on ${window.close_date}. You cannot submit for ${date}.`,
    };
  }
  return { allowed: true };
}
