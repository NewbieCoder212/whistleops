import { cn } from "@/lib/utils";
import {
  AssignmentStatusBadge,
  filledSlotSurfaceClass,
} from "@/features/assignments/assignmentStatusDisplay";
import type { AssignmentStatus } from "@shared/types";
import type { AssignBoardGame, AssignBoardSlot, Position } from "@shared/types";
import type { ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import { usePositionSlots } from "@/hooks/usePositionSlots";
import { formatGameTime } from "@/features/schedule/scheduleTypes";

const SLOT_RING: Record<string, string> = {
  filled: "",
  open_green: "ring-2 ring-emerald-500/60 border-emerald-500/40",
  open_amber: "ring-2 ring-amber-500/60 border-amber-500/40",
  open_red: "ring-2 ring-red-500/50 border-red-500/30",
};

interface AssignmentBoardGamesProps {
  games: AssignBoardGame[];
  highlightHour: number | null;
  onSlotClick: (game: ScheduleGame, position: Position, assignment: ScheduleAssignment | null) => void;
  onGameHover: (hour: number | null) => void;
}

function toScheduleGame(game: AssignBoardGame): ScheduleGame {
  return {
    id: game.id,
    date_time: game.date_time,
    venue_id: game.venue_id,
    status: game.status,
    home_team: game.home_team,
    away_team: game.away_team,
    league_tier: game.league_tier,
    league_type: game.league_type,
    notes: game.notes,
    game_number: game.game_number,
    home_score: game.home_score,
    away_score: game.away_score,
    gamesheet_external_id: game.gamesheet_external_id,
    created_at: game.created_at,
    updated_at: game.updated_at,
    venue: game.venue
      ? {
          id: game.venue.id,
          name: game.venue.name,
          timezone: game.venue.timezone ?? "America/Moncton",
          zone_id: game.venue.zone_id,
        }
      : null,
    assignments: (game.assignments ?? []).map((a) => ({
      id: a.id,
      game_id: a.game_id,
      official_id: a.official_id,
      position: a.position,
      status: a.status,
      cancel_reason: a.cancel_reason,
      created_at: a.created_at,
      updated_at: a.updated_at,
      official: a.official
        ? {
            id: a.official.id,
            full_name: a.official.full_name,
            official_type: a.official.official_type,
            email: a.official.email,
          }
        : null,
    })),
  };
}

function BoardSlotButton({
  position,
  slot,
  onClick,
}: {
  position: { key: Position; label: string; abbr: string; group: "ref" | "line" };
  slot: AssignBoardSlot;
  onClick: () => void;
}) {
  const assignment = slot.assignment;
  const filled = !!assignment;
  const isRef = position.group === "ref";
  const status = assignment?.status as AssignmentStatus | undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-all w-[112px] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        filled && status
          ? filledSlotSurfaceClass(status)
          : filled
            ? isRef
              ? "bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20"
              : "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
            : "border border-dashed border-border hover:border-primary/40 hover:bg-secondary/50",
        !filled && SLOT_RING[slot.slot_hint]
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider w-full flex items-center justify-between gap-1",
          filled
            ? isRef
              ? "text-blue-600 dark:text-blue-400"
              : "text-emerald-700 dark:text-emerald-400"
            : "text-muted-foreground/60"
        )}
      >
        <span>
          {position.abbr} · {position.label.split(" ")[0]}
        </span>
        {filled && status ? <AssignmentStatusBadge status={status} compact /> : null}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium truncate w-full mt-0.5 leading-tight",
          filled ? "text-foreground" : "text-muted-foreground/50 italic"
        )}
      >
        {filled
          ? (assignment?.official?.full_name ?? "Unknown")
          : "unassigned"}
      </span>
    </button>
  );
}

export function AssignmentBoardGames({
  games,
  highlightHour,
  onSlotClick,
  onGameHover,
}: AssignmentBoardGamesProps) {
  const { slots: positionSlots } = usePositionSlots();

  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center rounded-xl border border-dashed border-border">
        No games in this zone for the selected day.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game) => {
        const scheduleGame = toScheduleGame(game);
        const { timeStr, dayAbbr } = formatGameTime(game.date_time);
        const slotMap = new Map(game.slots.map((s) => [s.position, s]));
        const highlighted = highlightHour != null && game.game_hour === highlightHour;

        return (
          <div
            key={game.id}
            className={cn(
              "rounded-lg border border-border bg-card overflow-hidden transition-colors",
              highlighted && "ring-2 ring-primary/30 bg-primary/5"
            )}
            onMouseEnter={() => onGameHover(game.game_hour)}
            onMouseLeave={() => onGameHover(null)}
          >
            <div className="flex items-stretch">
              <div className="w-[68px] flex-shrink-0 flex flex-col items-center justify-center border-r border-border px-2 py-3 text-center bg-secondary/30">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {dayAbbr}
                </span>
                <span className="text-sm font-bold mt-0.5 tabular-nums leading-none">
                  {timeStr.split(" ")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {timeStr.split(" ")[1] ?? ""}
                </span>
              </div>
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {game.home_team ?? "TBD"}{" "}
                      <span className="font-normal text-muted-foreground">vs</span>{" "}
                      {game.away_team ?? "TBD"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {game.venue?.name ?? "No venue"}
                      {game.league_tier ? ` · ${game.league_tier}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {positionSlots.map((pos) => {
                    const slot = slotMap.get(pos.key);
                    if (!slot) return null;
                    const assignment = slot.assignment
                      ? ({
                          id: slot.assignment.id,
                          game_id: slot.assignment.game_id,
                          official_id: slot.assignment.official_id,
                          position: slot.assignment.position,
                          status: slot.assignment.status,
                          cancel_reason: slot.assignment.cancel_reason,
                          created_at: slot.assignment.created_at,
                          updated_at: slot.assignment.updated_at,
                          official: slot.assignment.official
                            ? {
                                id: slot.assignment.official.id,
                                full_name: slot.assignment.official.full_name,
                                official_type: slot.assignment.official.official_type,
                                email: slot.assignment.official.email,
                              }
                            : null,
                        } as ScheduleAssignment)
                      : null;
                    return (
                      <BoardSlotButton
                        key={pos.key}
                        position={pos}
                        slot={slot}
                        onClick={() => onSlotClick(scheduleGame, pos.key, assignment)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
