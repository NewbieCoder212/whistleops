import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AssignBoardGame, AssignBoardOfficial, Position } from "@shared/types";
import { AssignmentBoardPublishBar } from "@/features/assignBoard/AssignmentBoardPublishBar";
import { AssignmentBoardSummaryBar } from "@/features/assignBoard/AssignmentBoardSummary";
import { AssignmentBoardGamesTable } from "@/features/assignBoard/AssignmentBoardGamesTable";
import { AssignmentBoardHourFocus } from "@/features/assignBoard/AssignmentBoardHourFocus";
import { AssignmentBoardOfficials } from "@/features/assignBoard/AssignmentBoardOfficials";
import { computeBoardSummary } from "@/features/assignBoard/assignBoardUtils";
import { filterGamesByVenueIds } from "@/features/filters/rinkFilterUtils";
import type { AssignTarget, ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import { assignBoardApi } from "@/lib/resources";
import { ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export type ScheduleDayBoardAssignContext = {
  gameHour?: number;
  boardOfficials?: AssignBoardOfficial[];
};

export interface ScheduleDayBoardSectionProps {
  date: string;
  zoneId: string | null;
  venueIds?: string[] | null;
  leagueType: string | null;
  target: AssignTarget | null;
  onSlotClick: (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null
  ) => void;
  onPickOfficial: (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null,
    officialId: string
  ) => void;
  onAssignContextChange: (ctx: ScheduleDayBoardAssignContext) => void;
}

export function ScheduleDayBoardSection({
  date,
  zoneId,
  venueIds = null,
  leagueType,
  target,
  onSlotClick,
  onPickOfficial,
  onAssignContextChange,
}: ScheduleDayBoardSectionProps) {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [highlightHour, setHighlightHour] = useState<number | null>(null);
  const [highlightOfficialId, setHighlightOfficialId] = useState<string | null>(null);

  const { data: board, isLoading, isError, error: boardError } = useQuery({
    queryKey: ["assign-board", date, zoneId, leagueType],
    queryFn: () =>
      assignBoardApi.get({
        date,
        zoneId: zoneId!,
        leagueType: leagueType ?? undefined,
      }),
    enabled: !!zoneId,
  });

  const activeGame = useMemo(
    () => board?.games.find((g) => g.id === activeGameId) ?? null,
    [board?.games, activeGameId]
  );

  const filteredGames = useMemo(
    () => (board ? filterGamesByVenueIds(board.games, venueIds) : []),
    [board, venueIds]
  );

  const summary = useMemo(
    () =>
      board
        ? computeBoardSummary(
            filteredGames,
            board.officials,
            venueIds !== null ? undefined : board.summary
          )
        : null,
    [board, filteredGames, venueIds]
  );

  const matrixDefaultOpen = (board?.officials.length ?? 0) <= 25;

  const selectedGameHour = target?.game
    ? board?.games.find((g) => g.id === target.game.id)?.game_hour
    : undefined;

  useEffect(() => {
    onAssignContextChange({
      gameHour: selectedGameHour,
      boardOfficials: board?.officials,
    });
  }, [selectedGameHour, board?.officials, onAssignContextChange]);

  const handleSelectGame = (game: AssignBoardGame) => {
    setActiveGameId(game.id);
    setHighlightHour(game.game_hour);
  };

  const handleSlotClick = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null
  ) => {
    onSlotClick(game, position, assignment);
    const boardGame = board?.games.find((g) => g.id === game.id);
    if (boardGame) handleSelectGame(boardGame);
  };

  const handlePickOfficial = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null,
    officialId: string
  ) => {
    onPickOfficial(game, position, assignment, officialId);
  };

  const handleHourClick = (hour: number) => {
    setHighlightHour(hour);
    const match = board?.games.find((g) => g.game_hour === hour);
    if (match) setActiveGameId(match.id);
  };

  return (
    <div className="space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
          Available
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-muted border border-border" />
          No submission
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-red-500/30 border border-red-500/40" />
          Assigned to game (grid)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-violet-500/30 border border-violet-500/40" />
          Draft (not published)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-blue-500/30 border border-blue-500/40" />
          Filled slot (game row)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-dashed border-emerald-500/60 ring-1 ring-emerald-500/40" />
          Open slot (officials available)
        </span>
      </div>

      {!zoneId ? (
        <p className="text-sm text-muted-foreground">
          Select a zone to load the availability board for this day.
        </p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load availability board.
          {boardError instanceof ApiError && boardError.message ? ` ${boardError.message}` : ""}
        </p>
      ) : board && summary ? (
        <div className="space-y-5">
          {board.games.length === 0 && board.hints && board.hints.games_on_date > 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3 space-y-2">
              <p>
                No games for <span className="font-medium text-foreground">{board.zone_name}</span>{" "}
                on {date}.
                {leagueType ? " Clear the league filter above." : ""}
              </p>
              <div className="text-xs space-y-1.5">
                <p>
                  Schedule has {board.hints.games_on_date} game
                  {board.hints.games_on_date !== 1 ? "s" : ""} on this date, but none are tied to{" "}
                  {board.zone_name} via their rink.
                </p>
                {board.hints.rinks_missing_zone.length > 0 ? (
                  <p>
                    Assign zone on these rinks under{" "}
                    <Link to="/admin/config" className="text-primary hover:underline">
                      Configuration → Assignable rinks
                    </Link>
                    :{" "}
                    <span className="font-medium text-foreground">
                      {board.hints.rinks_missing_zone.join(", ")}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <AssignmentBoardSummaryBar summary={summary} />

          <AssignmentBoardPublishBar
            date={date}
            zoneId={zoneId}
            zoneName={board.zone_name}
            leagueType={leagueType}
            draftCount={summary.draft_assignments_count ?? 0}
          />

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Games · {board.zone_name}
            </h2>
            <AssignmentBoardGamesTable
              games={board.games}
              venueIds={venueIds}
              activeGameId={activeGameId}
              onSelectGame={handleSelectGame}
              onSlotClick={handleSlotClick}
            />
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Who is available
            </h2>
            <AssignmentBoardHourFocus
              game={activeGame}
              officials={board.officials}
              activePosition={target?.game.id === activeGameId ? target.position : null}
              onPickOfficial={handlePickOfficial}
              onSlotClick={handleSlotClick}
            />
          </section>

          <section>
            <AssignmentBoardOfficials
              officials={board.officials}
              games={filteredGames}
              highlightHour={highlightHour}
              highlightOfficialId={highlightOfficialId}
              defaultOpen={matrixDefaultOpen}
              onHourClick={handleHourClick}
              onHourHover={(hour, officialId) => {
                setHighlightHour(hour);
                setHighlightOfficialId(officialId);
              }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
