import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Zone } from "@shared/types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddGameModal } from "@/features/games/AddGameModal";
import { EditGameModal } from "@/features/games/EditGameModal";
import { DeleteGameDialog } from "@/features/games/DeleteGameDialog";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ScheduleGameCard } from "@/features/schedule/ScheduleGameCard";
import { MessageAssignedModal } from "@/features/messaging/MessageAssignedModal";
import { IncidentReportModal } from "@/features/incidents/IncidentReportModal";
import {
  ScheduleFilterBar,
  defaultScheduleFilters,
  buildGamesQueryParams,
  type ScheduleFilterState,
} from "@/features/filters/ScheduleFilterBar";
import {
  resolveDefaultZoneId,
  saveZonePreference,
} from "@/features/filters/scheduleFilterUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { ScheduleGame } from "@/features/schedule/scheduleTypes";
import { toDateKey, formatDateHeader } from "@/features/schedule/scheduleTypes";
import { gameHasDeclinedAssignment } from "@/features/assignBoard/assignBoardUtils";

export default function Schedule() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const zoneInitialized = useRef(false);
  const [searchParams] = useSearchParams();

  const [messageGame, setMessageGame] = useState<ScheduleGame | null>(null);
  const [incidentGame, setIncidentGame] = useState<ScheduleGame | null>(null);
  const [filters, setFilters] = useState<ScheduleFilterState>(defaultScheduleFilters);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [editGame, setEditGame] = useState<ScheduleGame | null>(null);
  const [deleteGame, setDeleteGame] = useState<ScheduleGame | null>(null);

  useEffect(() => {
    const date = searchParams.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      navigate(`/admin/assignment-board?date=${date}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile || zoneInitialized.current || zones.length === 0) return;
    zoneInitialized.current = true;

    const defaultZone = resolveDefaultZoneId({
      userId: user?.id,
      profileZoneId: profile.zone_id,
      role: profile.role,
      zoneIds: zones.map((z) => z.id),
    });

    setFilters((f) => ({ ...f, zoneId: defaultZone }));
  }, [profile, user?.id, zones]);

  const handleFiltersChange = (next: ScheduleFilterState) => {
    setFilters(next);
    saveZonePreference(user?.id, next.zoneId);
  };

  const scheduleZoneName =
    filters.zoneId != null
      ? zones.find((z) => z.id === filters.zoneId)?.name ?? null
      : null;

  const zonesById = useMemo(
    () => new Map(zones.map((z) => [z.id, z.name])),
    [zones]
  );

  const queryString = buildGamesQueryParams(filters);

  const { data: games, isLoading, isError } = useQuery<ScheduleGame[]>({
    queryKey: ["schedule-games", queryString],
    queryFn: () => api.get<ScheduleGame[]>(`/api/games?${queryString}`),
  });

  const filtered = useMemo(() => {
    if (!games) return [];
    return games.filter((g) => {
      if (filters.leagueType && g.league_type !== filters.leagueType) return false;
      if (filters.declinedOnly && !gameHasDeclinedAssignment(g)) return false;
      return true;
    });
  }, [games, filters.leagueType, filters.declinedOnly]);

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

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Week view: browse games, add or edit matchups, message crew, and file incidents.
              Crew slots are read-only here — click a slot or{" "}
              <span className="font-medium text-foreground">Assign on board</span> to staff games on the{" "}
              <Link to="/admin/assignment-board" className="text-primary hover:underline">
                Assignment Board
              </Link>
              .
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setAddGameOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add game
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <ScheduleFilterBar
            value={filters}
            onChange={handleFiltersChange}
            homeZoneId={profile?.zone_id}
            onOpenAssignmentBoard={(date) =>
              navigate(`/admin/assignment-board?date=${date}`)
            }
          />
        </div>

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
              <p className="text-sm font-medium">
                {filters.declinedOnly
                  ? "No games with declined assignments"
                  : "No games match filters"}
              </p>
              <p className="text-xs mt-0.5">
                {filters.declinedOnly
                  ? "Try a wider date range or another zone."
                  : "Try a wider date range, another zone, or add a game."}
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
                  <Link
                    to={`/admin/assignment-board?date=${group.key}`}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Assignment board
                  </Link>
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
                      zonesById={zonesById}
                      assignBoardHref={`/admin/assignment-board?date=${group.key}`}
                      onMessageClick={() => setMessageGame(game)}
                      onIncidentClick={() => setIncidentGame(game)}
                      onEditClick={() => setEditGame(game)}
                      onDeleteClick={() => setDeleteGame(game)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddGameModal
        open={addGameOpen}
        onClose={() => setAddGameOpen(false)}
        scheduleZoneId={filters.zoneId}
        scheduleZoneName={scheduleZoneName}
      />
      <EditGameModal
        game={editGame}
        onClose={() => setEditGame(null)}
        scheduleZoneId={filters.zoneId}
        scheduleZoneName={scheduleZoneName}
      />
      <DeleteGameDialog game={deleteGame} onClose={() => setDeleteGame(null)} />
      <MessageAssignedModal game={messageGame} onClose={() => setMessageGame(null)} />
      <IncidentReportModal game={incidentGame} onClose={() => setIncidentGame(null)} />
    </AdminLayout>
  );
}
