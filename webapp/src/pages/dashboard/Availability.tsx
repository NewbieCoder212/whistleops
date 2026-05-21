import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AvailabilityCalendar } from "@/features/availability/AvailabilityCalendar";
import { ZoneLeagueFilter, type FilterState } from "@/features/filters/ZoneLeagueFilter";
import { useProfile } from "@/hooks/useProfile";
import { api } from "@/lib/api";
import type { Zone } from "@shared/types";

type GameRow = {
  id: string;
  date_time: string;
  league_type: string | null;
  venue: { zone_id: string | null } | null;
};

/** Officials with a home zone only see games and counts for that zone. Supervisors see all zones. */
function useLockedHomeZoneId(): string | null {
  const { data: profile } = useProfile();
  return useMemo(() => {
    if (!profile?.zone_id || profile.role !== "OFFICIAL") return null;
    return profile.zone_id;
  }, [profile?.zone_id, profile?.role]);
}

export default function Availability() {
  const lockedZoneId = useLockedHomeZoneId();
  const [filters, setFilters] = useState<FilterState>({ zoneId: null, leagueType: null });
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const lockedZoneName = lockedZoneId
    ? zones.find((z) => z.id === lockedZoneId)?.name
    : null;

  useEffect(() => {
    if (lockedZoneId) {
      setFilters((f) => (f.zoneId === lockedZoneId ? f : { ...f, zoneId: lockedZoneId }));
    }
  }, [lockedZoneId]);

  const effectiveZoneId = lockedZoneId ?? filters.zoneId;

  // Fetch games for the visible week to show context dots
  const { data: weekGames = [] } = useQuery<GameRow[]>({
    queryKey: ["games", "week-context", weekStart, weekEnd],
    queryFn: () =>
      api.get<GameRow[]>(
        `/api/games?startDate=${weekStart}T00:00:00Z&endDate=${weekEnd}T23:59:59Z`
      ),
    enabled: !!weekStart && !!weekEnd,
  });

  // Build a map: dateStr → count of matching games
  const gameCounts: Record<string, number> = {};
  for (const g of weekGames) {
    const dateStr = g.date_time.slice(0, 10);
    if (effectiveZoneId && g.venue?.zone_id !== effectiveZoneId) continue;
    if (filters.leagueType && g.league_type !== filters.leagueType) continue;
    gameCounts[dateStr] = (gameCounts[dateStr] ?? 0) + 1;
  }

  const handleFilterChange = (next: FilterState) => {
    setFilters(
      lockedZoneId ? { ...next, zoneId: lockedZoneId } : next
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">My Availability</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lockedZoneName
              ? `Check the hours you're free each day. Game counts show scheduled games in ${lockedZoneName}. Use the date controls to move one day at a time.`
              : "Check the hours you're free each day. Game counts show where you're needed. Use the date controls to move one day at a time."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <ZoneLeagueFilter
            value={filters}
            onChange={handleFilterChange}
            lockedZoneId={lockedZoneId}
          />
        </div>

        <AvailabilityCalendar
          gameCounts={gameCounts}
          onWeekChange={(start, end) => {
            setWeekStart(start);
            setWeekEnd(end);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
