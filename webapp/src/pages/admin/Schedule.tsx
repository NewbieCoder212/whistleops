import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddGameModal } from "@/features/games/AddGameModal";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ScheduleGameCard } from "@/features/schedule/ScheduleGameCard";
import { AssignPanel } from "@/features/schedule/AssignPanel";
import { MessageAssignedModal } from "@/features/messaging/MessageAssignedModal";
import { IncidentReportModal } from "@/features/incidents/IncidentReportModal";
import { ZoneLeagueFilter, type FilterState } from "@/features/filters/ZoneLeagueFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Position } from "@shared/types";
import type { ScheduleGame, ScheduleAssignment, AssignTarget } from "@/features/schedule/scheduleTypes";
import { toDateKey, formatDateHeader } from "@/features/schedule/scheduleTypes";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Schedule() {
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [messageGame, setMessageGame] = useState<ScheduleGame | null>(null);
  const [incidentGame, setIncidentGame] = useState<ScheduleGame | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ zoneId: null, leagueType: null });
  const [addGameOpen, setAddGameOpen] = useState(false);

  const startDate = showPast ? undefined : todayIso();

  const { data: games, isLoading, isError } = useQuery<ScheduleGame[]>({
    queryKey: ["schedule-games", startDate],
    queryFn: () =>
      api.get<ScheduleGame[]>(
        `/api/games${startDate ? `?startDate=${startDate}T00:00:00Z` : ""}`
      ),
  });

  const filtered = useMemo(() => {
    if (!games) return [];
    return games.filter((g) => {
      if (filters.zoneId && (g as ScheduleGame & { venue?: { zone_id?: string | null } }).venue?.zone_id !== filters.zoneId) return false;
      if (filters.leagueType && (g as ScheduleGame & { league_type?: string | null }).league_type !== filters.leagueType) return false;
      return true;
    });
  }, [games, filters]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleGame[]>();
    for (const g of filtered) {
      const key = toDateKey(g.date_time);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dayGames]) => ({
        key,
        label: formatDateHeader(key),
        games: dayGames,
      }));
  }, [filtered]);

  const handleSlotClick = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null
  ) => {
    setTarget({ game, position, assignment });
  };

  const hiddenCount = (games?.length ?? 0) - filtered.length;

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any assignment slot to assign or reassign an official.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setAddGameOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add game
            </Button>
            <button
              onClick={() => setShowPast((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-2.5 py-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              {showPast ? "Showing all games" : "Upcoming only"}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <ZoneLeagueFilter value={filters} onChange={setFilters} />
          {hiddenCount > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {hiddenCount} game{hiddenCount !== 1 ? "s" : ""} hidden by filter
            </p>
          ) : null}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm">Failed to load schedule.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No games match filters</p>
              <p className="text-xs mt-0.5">
                {showPast
                  ? "Try adjusting the filters above, or add a game."
                  : "Add a game or import a CSV schedule."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-1.5"
                onClick={() => setAddGameOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add game
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 border-b border-dashed border-border flex-1" />
                  <span className="text-[10px] text-muted-foreground">
                    {group.games.length} game{group.games.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.games.map((game) => (
                    <ScheduleGameCard
                      key={game.id}
                      game={game}
                      onSlotClick={(position, assignment) =>
                        handleSlotClick(game, position, assignment)
                      }
                      onMessageClick={() => setMessageGame(game)}
                      onIncidentClick={() => setIncidentGame(game)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddGameModal open={addGameOpen} onClose={() => setAddGameOpen(false)} />
      <AssignPanel target={target} onClose={() => setTarget(null)} />
      <MessageAssignedModal game={messageGame} onClose={() => setMessageGame(null)} />
      <IncidentReportModal game={incidentGame} onClose={() => setIncidentGame(null)} />
    </AdminLayout>
  );
}
