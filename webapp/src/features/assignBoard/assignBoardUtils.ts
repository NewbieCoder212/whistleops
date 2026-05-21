import type {
  AssignBoardGame,
  AssignBoardOfficial,
  AssignBoardSummary,
  AvailabilityStatus,
  CertificationLevel,
  LeagueQualificationWithLevel,
  Profile,
} from "@shared/types";
import { addDaysYmd, todayYmd } from "@/lib/atlanticTime";
import {
  buildLevelsById,
  checkOfficialQualified,
  resolveQualificationRule,
} from "@/features/schedule/qualification";

export function resolveOfficialAvailabilityStatus(
  official: AssignBoardOfficial,
  hour: number
): AvailabilityStatus {
  if (official.busy_hours.includes(hour)) return "busy";
  if (!official.time_slots || official.time_slots.length === 0) return "no_submission";
  if (official.time_slots.includes(hour)) return "available";
  return "unavailable";
}

export function addDaysIso(date: string, delta: number): string {
  return addDaysYmd(date, delta);
}

/** Calendar today in Atlantic (YYYY-MM-DD). */
export function todayIso(): string {
  return todayYmd();
}

export const AVAILABILITY_STATUS_SORT: Record<AvailabilityStatus, number> = {
  available: 0,
  no_submission: 1,
  unavailable: 2,
  busy: 3,
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: "Available",
  no_submission: "No submission",
  unavailable: "Unavailable",
  busy: "Assigned",
};

export function computeBoardSummary(
  games: AssignBoardGame[],
  officials: AssignBoardOfficial[],
  apiSummary?: AssignBoardSummary
): AssignBoardSummary {
  if (apiSummary) return apiSummary;
  let openSlots = 0;
  let nextUnassigned: string | null = null;
  for (const g of games) {
    let hasOpen = false;
    for (const s of g.slots) {
      if (!s.assignment) {
        openSlots++;
        hasOpen = true;
      }
    }
    if (hasOpen && !nextUnassigned) nextUnassigned = g.date_time;
  }
  const response = mergeAssignmentResponseSummary(games);
  return {
    games_count: games.length,
    open_slots_count: openSlots,
    officials_count: officials.length,
    officials_with_submission_count: officials.filter((o) => o.time_slots.length > 0).length,
    next_unassigned_game_at: nextUnassigned,
    ...response,
  };
}

export function gameHasOpenSlot(game: AssignBoardGame): boolean {
  return game.slots.some((s) => !s.assignment);
}

export function openSlotCount(game: AssignBoardGame): number {
  return game.slots.filter((s) => !s.assignment).length;
}

/** Game has at least one filled slot still awaiting official confirmation. */
export function gameAwaitingConfirmation(game: AssignBoardGame): boolean {
  const fromSlots = game.slots.some((s) => s.assignment?.status === "PENDING");
  if (fromSlots) return true;
  return (game.assignments ?? []).some((a) => a.status === "PENDING");
}

type GameWithAssignments = {
  assignments?: { status: string }[];
  slots?: { assignment?: { status: string } | null }[];
};

/** Game has at least one assignment an official declined (REJECTED). */
export function gameHasDeclinedAssignment(game: GameWithAssignments): boolean {
  const fromSlots = (game.slots ?? []).some((s) => s.assignment?.status === "REJECTED");
  if (fromSlots) return true;
  return (game.assignments ?? []).some((a) => a.status === "REJECTED");
}

function countAssignmentsByStatus(
  games: AssignBoardGame[],
  status: "DRAFT" | "PENDING" | "CONFIRMED" | "REJECTED"
): number {
  let n = 0;
  for (const g of games) {
    for (const a of g.assignments ?? []) {
      if (a.status === status) n++;
    }
  }
  return n;
}

export function mergeAssignmentResponseSummary(
  games: AssignBoardGame[],
  apiSummary?: AssignBoardSummary
): Pick<
  AssignBoardSummary,
  | "draft_assignments_count"
  | "pending_assignments_count"
  | "confirmed_assignments_count"
  | "declined_assignments_count"
  | "games_awaiting_confirmation_count"
> {
  if (
    apiSummary &&
    apiSummary.pending_assignments_count != null &&
    apiSummary.confirmed_assignments_count != null
  ) {
    return {
      draft_assignments_count: apiSummary.draft_assignments_count ?? 0,
      pending_assignments_count: apiSummary.pending_assignments_count,
      confirmed_assignments_count: apiSummary.confirmed_assignments_count,
      declined_assignments_count: apiSummary.declined_assignments_count ?? 0,
      games_awaiting_confirmation_count:
        apiSummary.games_awaiting_confirmation_count ?? 0,
    };
  }
  return {
    draft_assignments_count: countAssignmentsByStatus(games, "DRAFT"),
    pending_assignments_count: countAssignmentsByStatus(games, "PENDING"),
    confirmed_assignments_count: countAssignmentsByStatus(games, "CONFIRMED"),
    declined_assignments_count: countAssignmentsByStatus(games, "REJECTED"),
    games_awaiting_confirmation_count: games.filter(gameAwaitingConfirmation).length,
  };
}

export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

export type HourFocusOfficialRow = {
  official: AssignBoardOfficial;
  profile: Profile | null;
  availabilityStatus: AvailabilityStatus;
  qualified: boolean;
  qualificationReason?: string;
  levelName?: string | null;
  canAssign: boolean;
};

export function buildHourFocusOfficialRows(
  game: AssignBoardGame,
  officials: AssignBoardOfficial[],
  profiles: Profile[],
  qualifications: LeagueQualificationWithLevel[],
  levels: CertificationLevel[]
): Record<AvailabilityStatus, HourFocusOfficialRow[]> {
  const hour = game.game_hour;
  const rule = resolveQualificationRule(game, qualifications);
  const levelsById = buildLevelsById(levels);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const rows: HourFocusOfficialRow[] = officials.map((official) => {
    const profile = profileById.get(official.official_id) ?? null;
    const availabilityStatus = resolveOfficialAvailabilityStatus(official, hour);
    let qualified = true;
    let qualificationReason: string | undefined;
    let levelName = official.official_level_name ?? null;

    if (rule && profile) {
      const result = checkOfficialQualified(
        profile,
        rule.minimumLevel.sort_order,
        levelsById,
        rule.minimumLevel.name,
        rule.leagueKey
      );
      qualified = result.qualified;
      qualificationReason = result.reason;
      levelName = result.officialLevelName ?? levelName;
    }

    const canAssign =
      qualified &&
      (availabilityStatus === "available" || availabilityStatus === "no_submission");

    return {
      official,
      profile,
      availabilityStatus,
      qualified,
      qualificationReason,
      levelName,
      canAssign,
    };
  });

  const buckets: Record<AvailabilityStatus, HourFocusOfficialRow[]> = {
    available: [],
    no_submission: [],
    unavailable: [],
    busy: [],
  };

  for (const row of rows) {
    if (!row.qualified) continue;
    buckets[row.availabilityStatus].push(row);
  }

  const sortByName = (a: HourFocusOfficialRow, b: HourFocusOfficialRow) =>
    (a.official.full_name ?? a.official.email).localeCompare(
      b.official.full_name ?? b.official.email
    );

  for (const key of Object.keys(buckets) as AvailabilityStatus[]) {
    buckets[key].sort(sortByName);
  }

  return buckets;
}
