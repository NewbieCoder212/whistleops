import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { AssignBoardGame, AssignBoardSlot, Position } from "@shared/types";
import type { ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import { usePositionSlots } from "@/hooks/usePositionSlots";
import { formatGameTime } from "@/features/schedule/scheduleTypes";
import {
  gameAwaitingConfirmation,
  gameHasDeclinedAssignment,
  gameHasOpenSlot,
  openSlotCount,
} from "./assignBoardUtils";
import {
  AssignmentStatusBadge,
  ASSIGNMENT_STATUS_SHORT,
  filledSlotSurfaceClass,
} from "@/features/assignments/assignmentStatusDisplay";
import type { AssignmentStatus } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  filterGamesByVenueIds,
  groupGamesByVenue,
} from "@/features/filters/rinkFilterUtils";

const SLOT_RING: Record<string, string> = {
  filled: "bg-blue-500/10 border-blue-500/30 text-foreground",
  open_green: "ring-1 ring-emerald-500/50 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  open_amber: "ring-1 ring-amber-500/50 border-amber-500/40 text-amber-700 dark:text-amber-300",
  open_red: "ring-1 ring-red-500/40 border-red-500/30 text-muted-foreground",
};

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

function MiniSlot({
  abbr,
  slot,
  onClick,
}: {
  abbr: string;
  slot: AssignBoardSlot;
  onClick: () => void;
}) {
  const filled = !!slot.assignment;
  const status = slot.assignment?.status as AssignmentStatus | undefined;
  const name = slot.assignment?.official?.full_name?.split(" ")[0] ?? "—";
  const statusLabel = status ? ASSIGNMENT_STATUS_SHORT[status] : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={
        filled
          ? `${abbr}: ${slot.assignment?.official?.full_name ?? "Assigned"}${statusLabel ? ` · ${statusLabel}` : ""} — click to change`
          : `${abbr}: unassigned · ${slot.available_qualified_count} qualified available — click to assign`
      }
      className={cn(
        "min-w-[58px] max-w-[84px] rounded border px-1 py-0.5 text-[10px] font-medium transition-colors hover:opacity-90 flex flex-col items-center gap-0.5",
        filled && status
          ? filledSlotSurfaceClass(status)
          : filled
            ? SLOT_RING.filled
            : SLOT_RING[slot.slot_hint] ?? SLOT_RING.open_red
      )}
    >
      <span className="w-full truncate text-center leading-tight">
        <span className="text-[9px] opacity-70">{abbr}</span> {filled ? name : "open"}
      </span>
      {filled && status ? (
        <AssignmentStatusBadge status={status} compact className="scale-90 origin-center" />
      ) : null}
    </button>
  );
}

interface AssignmentBoardGamesTableProps {
  games: AssignBoardGame[];
  venueIds?: string[] | null;
  activeGameId: string | null;
  onSelectGame: (game: AssignBoardGame) => void;
  onSlotClick: (game: ScheduleGame, position: Position, assignment: ScheduleAssignment | null) => void;
}

function GamesTableHeader({ showRinkColumn }: { showRinkColumn: boolean }) {
  const { slots: positionSlots } = usePositionSlots();

  return (
    <thead>
      <tr className="border-b border-border bg-muted/40 text-left">
        <th className="px-3 py-2 font-semibold w-[88px]">Time</th>
        <th className="px-3 py-2 font-semibold min-w-[160px]">Matchup</th>
        {showRinkColumn ? (
          <th className="px-3 py-2 font-semibold min-w-[100px]">Rink</th>
        ) : null}
        <th className="px-3 py-2 font-semibold w-12 text-center">Open</th>
        {positionSlots.map((p) => (
          <th key={p.key} className="px-1 py-2 font-semibold text-center w-[60px]">
            {p.abbr}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function GameRow({
  game,
  activeGameId,
  showRinkColumn,
  onSelectGame,
  onSlotClick,
}: {
  game: AssignBoardGame;
  activeGameId: string | null;
  showRinkColumn: boolean;
  onSelectGame: (game: AssignBoardGame) => void;
  onSlotClick: (game: ScheduleGame, position: Position, assignment: ScheduleAssignment | null) => void;
}) {
  const { slots: positionSlots } = usePositionSlots();
  const scheduleGame = toScheduleGame(game);
  const { timeStr } = formatGameTime(game.date_time);
  const slotMap = new Map(game.slots.map((s) => [s.position, s]));
  const active = activeGameId === game.id;
  const open = openSlotCount(game);

  return (
    <tr
      className={cn(
        "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30",
        active && "bg-primary/5 ring-1 ring-inset ring-primary/20"
      )}
      onClick={() => onSelectGame(game)}
    >
      <td className="px-3 py-2 font-semibold tabular-nums whitespace-nowrap">{timeStr}</td>
      <td className="px-3 py-2">
        <span className="font-medium">
          {game.home_team ?? "TBD"} vs {game.away_team ?? "TBD"}
        </span>
        {game.league_tier ? (
          <span className="text-muted-foreground ml-1">· {game.league_tier}</span>
        ) : null}
      </td>
      {showRinkColumn ? (
        <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">
          {game.venue?.name ?? "—"}
        </td>
      ) : null}
      <td className="px-3 py-2 text-center font-medium tabular-nums">{open}</td>
      {positionSlots.map((pos) => {
        const slot = slotMap.get(pos.key);
        if (!slot) return <td key={pos.key} />;
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
          <td key={pos.key} className="px-1 py-1.5 text-center">
            <MiniSlot
              abbr={pos.abbr}
              slot={slot}
              onClick={() => onSlotClick(scheduleGame, pos.key, assignment)}
            />
          </td>
        );
      })}
    </tr>
  );
}

export function AssignmentBoardGamesTable({
  games,
  venueIds = null,
  activeGameId,
  onSelectGame,
  onSlotClick,
}: AssignmentBoardGamesTableProps) {
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [declinedOnly, setDeclinedOnly] = useState(false);
  const [collapsedVenues, setCollapsedVenues] = useState<Set<string>>(new Set());

  const afterStatusFilters = useMemo(() => {
    let list = [...games].sort((a, b) => a.date_time.localeCompare(b.date_time));
    if (unassignedOnly) list = list.filter(gameHasOpenSlot);
    if (awaitingOnly) list = list.filter(gameAwaitingConfirmation);
    if (declinedOnly) list = list.filter(gameHasDeclinedAssignment);
    return list;
  }, [games, unassignedOnly, awaitingOnly, declinedOnly]);

  const visible = useMemo(
    () => filterGamesByVenueIds(afterStatusFilters, venueIds),
    [afterStatusFilters, venueIds]
  );

  const venueGroups = useMemo(() => groupGamesByVenue(visible), [visible]);
  const groupByRink = venueGroups.length > 0;

  useEffect(() => {
    if (venueGroups.length > 5) {
      setCollapsedVenues(new Set(venueGroups.map((g) => g.venueId)));
    } else {
      setCollapsedVenues(new Set());
    }
  }, [venueGroups.length, venueGroups.map((g) => g.venueId).join(",")]);

  const jumpToNext = () => {
    const next = visible.find(gameHasOpenSlot);
    if (next) onSelectGame(next);
  };

  const toggleVenueCollapsed = (venueId: string) => {
    setCollapsedVenues((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) next.delete(venueId);
      else next.add(venueId);
      return next;
    });
  };

  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border">
        No games in this zone for the selected day.
      </p>
    );
  }

  const emptyMessage =
    venueIds && venueIds.length === 0
      ? "No rinks selected — choose rinks in the filter above."
      : declinedOnly
        ? "No games with declined assignments."
        : awaitingOnly
          ? "No games with pending official responses."
          : unassignedOnly
            ? "All games are fully assigned."
            : "No games for selected rinks — adjust the rink filter.";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="board-unassigned-only"
              checked={unassignedOnly}
              onCheckedChange={(v) => setUnassignedOnly(v === true)}
            />
            <Label htmlFor="board-unassigned-only" className="text-xs font-normal cursor-pointer">
              Unassigned games only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="board-awaiting-only"
              checked={awaitingOnly}
              onCheckedChange={(v) => setAwaitingOnly(v === true)}
            />
            <Label htmlFor="board-awaiting-only" className="text-xs font-normal cursor-pointer">
              Awaiting confirmation
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="board-declined-only"
              checked={declinedOnly}
              onCheckedChange={(v) => setDeclinedOnly(v === true)}
            />
            <Label htmlFor="board-declined-only" className="text-xs font-normal cursor-pointer">
              Has declined assignments
            </Label>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={jumpToNext}>
          Jump to next open
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border">
          {emptyMessage}
        </p>
      ) : groupByRink ? (
        <div className="space-y-3">
          {venueGroups.map((group) => {
            const openSlots = group.games.reduce((n, g) => n + openSlotCount(g), 0);
            const collapsed = collapsedVenues.has(group.venueId);
            return (
              <div key={group.venueId} className="rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleVenueCollapsed(group.venueId)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {collapsed ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-semibold truncate">{group.venueName}</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {group.games.length} game{group.games.length !== 1 ? "s" : ""}
                    {openSlots > 0 ? ` · ${openSlots} open` : ""}
                  </span>
                </button>
                {!collapsed ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <GamesTableHeader showRinkColumn={false} />
                      <tbody>
                        {group.games.map((game) => (
                          <GameRow
                            key={game.id}
                            game={game}
                            activeGameId={activeGameId}
                            showRinkColumn={false}
                            onSelectGame={onSelectGame}
                            onSlotClick={onSlotClick}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs border-collapse">
            <GamesTableHeader showRinkColumn={true} />
            <tbody>
              {visible.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  activeGameId={activeGameId}
                  showRinkColumn={true}
                  onSelectGame={onSelectGame}
                  onSlotClick={onSlotClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
