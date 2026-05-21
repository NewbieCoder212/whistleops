import type { Position, AssignmentStatus, GameStatus } from "@shared/types";

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

export function toDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateHeader(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatGameTime(isoStr: string): { timeStr: string; dayAbbr: string } {
  const d = new Date(isoStr);
  const timeStr = d.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dayAbbr = d.toLocaleDateString("en-CA", { weekday: "short" });
  return { timeStr, dayAbbr };
}
