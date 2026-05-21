import type { Position, AssignmentStatus, GameStatus } from "@shared/types";
import {
  ATLANTIC_TIMEZONE,
  formatGameTime,
  toDateKeyFromIso,
} from "@/lib/atlanticTime";

export type OfficialSnap = {
  id: string;
  full_name: string | null;
  official_type: string | null;
  email?: string | null;
};

export type ScheduleAssignment = {
  id: string;
  game_id: string;
  official_id: string;
  position: Position;
  status: AssignmentStatus;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  official: OfficialSnap | null;
};

export type ScheduleGame = {
  id: string;
  date_time: string;
  venue_id: string | null;
  status: GameStatus;
  home_team: string | null;
  away_team: string | null;
  league_tier: string | null;
  league_type?: string | null;
  is_cash_game?: boolean;
  notes: string | null;
  game_number: number | null;
  home_score?: number | null;
  away_score?: number | null;
  gamesheet_external_id?: string | null;
  created_at: string;
  updated_at: string;
  venue: {
    id: string;
    name: string;
    timezone: string;
    address?: string | null;
    zone_id?: string | null;
  } | null;
  assignments: ScheduleAssignment[];
};

export type AssignTarget = {
  game: ScheduleGame;
  position: Position;
  assignment: ScheduleAssignment | null;
};

export const SLOT_POSITIONS: Array<{ key: Position; label: string; abbr: string; group: "ref" | "line" }> = [
  { key: "REF1", label: "Referee 1", abbr: "R1", group: "ref" },
  { key: "REF2", label: "Referee 2", abbr: "R2", group: "ref" },
  { key: "LINE1", label: "Linesman 1", abbr: "L1", group: "line" },
  { key: "LINE2", label: "Linesman 2", abbr: "L2", group: "line" },
];

export const GAME_STATUS_STYLES: Record<GameStatus, string> = {
  UNASSIGNED: "text-amber-500",
  ASSIGNED: "text-blue-500",
  COMPLETED: "text-emerald-500",
  CANCELLED: "text-muted-foreground line-through",
};

/** Calendar date of a game in Atlantic (YYYY-MM-DD). */
export function toDateKey(isoStr: string): string {
  return toDateKeyFromIso(isoStr, ATLANTIC_TIMEZONE);
}

export { formatGameTime };

export function formatDateHeader(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const iso = `${key}T12:00:00.000Z`;
  const anchor = new Date(iso);
  if (!Number.isNaN(anchor.getTime())) {
    return anchor.toLocaleDateString("en-CA", {
      timeZone: ATLANTIC_TIMEZONE,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const date = new Date(y!, m! - 1, d!);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATLANTIC_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
