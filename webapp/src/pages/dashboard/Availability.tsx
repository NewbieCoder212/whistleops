import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AvailabilityCalendar } from "@/features/availability/AvailabilityCalendar";
import { ZoneLeagueFilter, type FilterState } from "@/features/filters/ZoneLeagueFilter";
import { api } from "@/lib/api";

type GameRow = {
  id: string;
  date_time: string;
  league_type: string | null;
  venue: { zone_id: string | null } | null;
};

export default function Availability() {
  const [filters, setFilters] = useState<FilterState>({ zoneId: null, leagueType: null });
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);

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
    if (filters.zoneId && g.venue?.zone_id !== filters.zoneId) continue;
    if (filters.leagueType && g.league_type !== filters.leagueType) continue;
    gameCounts[dateStr] = (gameCounts[dateStr] ?? 0) + 1;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">My Availability</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Check the hours you're free each day. Game counts show where you're needed.
          </p>
        </div>

        {/* Filter */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <ZoneLeagueFilter value={filters} onChange={setFilters} />
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
