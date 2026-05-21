import { serviceDb } from "../db";
import { dateKeyFromIso, gameHourFromIso } from "./availabilityMatch";

/** Assignment statuses that block the official for that game hour. */
export const BOOKED_ASSIGNMENT_STATUSES = ["DRAFT", "PENDING", "CONFIRMED"] as const;

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export type BookedHoursByOfficial = Map<string, Record<string, number[]>>;

/**
 * Hours per calendar day when an official has an active assignment (draft/pending/confirmed).
 */
export async function loadBookedHoursByOfficial(
  workspaceId: string,
  officialIds: string[],
  startDate: string,
  endDate: string
): Promise<BookedHoursByOfficial> {
  const result: BookedHoursByOfficial = new Map();
  if (officialIds.length === 0) return result;

  const { data: rows, error } = await serviceDb()
    .from("assignments")
    .select("official_id, status, game:games(date_time, workspace_id)")
    .in("official_id", officialIds)
    .in("status", [...BOOKED_ASSIGNMENT_STATUSES]);
  if (error) throw error;

  type GameRef = { date_time: string; workspace_id: string };

  for (const raw of rows ?? []) {
    const oid = raw.official_id as string;
    const game = unwrapOne(raw.game as GameRef | GameRef[] | null);
    if (!game || game.workspace_id !== workspaceId) continue;

    const dateKey = dateKeyFromIso(game.date_time);
    if (dateKey < startDate || dateKey > endDate) continue;

    const hour = gameHourFromIso(game.date_time);
    const byDate = result.get(oid) ?? {};
    const list = byDate[dateKey] ?? [];
    if (!list.includes(hour)) list.push(hour);
    byDate[dateKey] = list.sort((a, b) => a - b);
    result.set(oid, byDate);
  }

  return result;
}

export async function loadBookedHoursForOfficial(
  workspaceId: string,
  officialId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number[]>> {
  const map = await loadBookedHoursByOfficial(
    workspaceId,
    [officialId],
    startDate,
    endDate
  );
  return map.get(officialId) ?? {};
}
