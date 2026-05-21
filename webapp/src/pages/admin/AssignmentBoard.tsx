import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AssignmentBoardSummaryBar } from "@/features/assignBoard/AssignmentBoardSummary";
import { AssignmentBoardGamesTable } from "@/features/assignBoard/AssignmentBoardGamesTable";
import { AssignmentBoardHourFocus } from "@/features/assignBoard/AssignmentBoardHourFocus";
import { AssignmentBoardOfficials } from "@/features/assignBoard/AssignmentBoardOfficials";
import { addDaysIso, computeBoardSummary, todayIso } from "@/features/assignBoard/assignBoardUtils";
import { loadSavedZoneId, saveZonePreference } from "@/features/filters/scheduleFilterUtils";
import { LEAGUE_TYPES } from "@/features/filters/ZoneLeagueFilter";
import { AssignPanel } from "@/features/schedule/AssignPanel";
import type { AssignTarget, ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import { assignBoardApi } from "@/lib/resources";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import type { AssignBoardGame, Position, Zone } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentBoardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const zoneInitialized = useRef(false);
  const [searchParams] = useSearchParams();
  const dateFromUrl = searchParams.get("date");
  const initialDate =
    dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl) ? dateFromUrl : todayIso();

  const [date, setDate] = useState(initialDate);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [leagueType, setLeagueType] = useState<string | null>(null);
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [preselectedOfficialId, setPreselectedOfficialId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [highlightHour, setHighlightHour] = useState<number | null>(null);
  const [highlightOfficialId, setHighlightOfficialId] = useState<string | null>(null);

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile || zoneInitialized.current) return;
    zoneInitialized.current = true;
    const saved = loadSavedZoneId(user?.id);
    if (saved) setZoneId(saved);
    else if (profile.zone_id) setZoneId(profile.zone_id);
    else if (zones.length > 0) setZoneId(zones[0]!.id);
  }, [profile, user?.id, zones]);

  useEffect(() => {
    if (zoneId && zones.length > 0 && !zones.some((z) => z.id === zoneId)) {
      setZoneId(zones[0]!.id);
    }
  }, [zones, zoneId]);

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

  const summary = useMemo(
    () =>
      board
        ? computeBoardSummary(board.games, board.officials, board.summary)
        : null,
    [board]
  );

  const matrixDefaultOpen = (board?.officials.length ?? 0) <= 25;

  const handleZoneChange = (id: string) => {
    setZoneId(id);
    saveZonePreference(user?.id, id);
  };

  const handleSelectGame = (game: AssignBoardGame) => {
    setActiveGameId(game.id);
    setHighlightHour(game.game_hour);
  };

  const handleSlotClick = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null
  ) => {
    setPreselectedOfficialId(null);
    setTarget({ game, position, assignment });
    const boardGame = board?.games.find((g) => g.id === game.id);
    if (boardGame) handleSelectGame(boardGame);
  };

  const handlePickOfficial = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null,
    officialId: string
  ) => {
    setPreselectedOfficialId(officialId);
    setTarget({ game, position, assignment });
  };

  const handleHourClick = (hour: number) => {
    setHighlightHour(hour);
    const match = board?.games.find((g) => g.game_hour === hour);
    if (match) setActiveGameId(match.id);
  };

  const selectedGameHour = target?.game
    ? board?.games.find((g) => g.id === target.game.id)?.game_hour
    : undefined;

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Assignment Board
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign games for one day — compact schedule, hour focus, and full availability grid.{" "}
              <Link to="/admin/schedule" className="text-primary hover:underline">
                Week schedule
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDate((d) => addDaysIso(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDate((d) => addDaysIso(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={zoneId ?? ""} onValueChange={handleZoneChange}>
            <SelectTrigger className="h-8 min-w-[180px] text-xs">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            {LEAGUE_TYPES.map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setLeagueType(leagueType === lt ? null : lt)}
                className={cn(
                  "h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                  leagueType === lt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

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
            <span className="h-3 w-3 rounded-sm bg-amber-500/30 border border-amber-500/40" />
            Busy / conflict
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-blue-500/30 border border-blue-500/40" />
            Assigned
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-dashed border-emerald-500/60 ring-1 ring-emerald-500/40" />
            Open slot (officials available)
          </span>
        </div>

        {!zoneId ? (
          <p className="text-sm text-muted-foreground">Select a zone to load the board.</p>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load assignment board.
            {boardError instanceof ApiError && boardError.message
              ? ` ${boardError.message}`
              : ""}
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

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Games · {board.zone_name}
              </h2>
              <AssignmentBoardGamesTable
                games={board.games}
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

      <AssignPanel
        target={target}
        onClose={() => {
          setTarget(null);
          setPreselectedOfficialId(null);
        }}
        gameHour={selectedGameHour}
        boardOfficials={board?.officials}
        preselectedOfficialId={preselectedOfficialId}
        onAssigned={() => {
          qc.invalidateQueries({ queryKey: ["assign-board"] });
          qc.invalidateQueries({ queryKey: ["schedule-games"] });
        }}
      />
    </AdminLayout>
  );
}
