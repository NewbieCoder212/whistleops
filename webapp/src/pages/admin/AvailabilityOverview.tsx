import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Search, User } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AvailabilityWeekGrid } from "@/features/availability/AvailabilityWeekGrid";
import {
  getMondayOfWeek,
  getWeekDates,
  slotsToHoursMap,
  toYMD,
} from "@/features/availability/availabilityConstants";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot, Zone } from "@shared/types";

type OverviewOfficial = {
  official_id: string;
  full_name: string | null;
  email: string;
  zone_id: string | null;
  slots: AvailabilitySlot[];
};

export default function AvailabilityOverview() {
  const [monday, setMonday] = useState(() => getMondayOfWeek(new Date()));
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(monday), [monday]);
  const start = weekDates[0]!;
  const end = weekDates[6]!;

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["availability", "overview", start, end],
    queryFn: () =>
      api.get<{ officials: OverviewOfficial[] }>(
        `/api/availability/overview?start=${start}&end=${end}`
      ),
  });

  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.name])),
    [zones]
  );

  const officials = useMemo(() => {
    const list = data?.officials ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.full_name?.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const selected = officials.find((o) => o.official_id === selectedId) ?? officials[0] ?? null;

  useEffect(() => {
    if (officials.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !officials.some((o) => o.official_id === selectedId)) {
      setSelectedId(officials[0]!.official_id);
    }
  }, [officials, selectedId]);

  const hoursMap = useMemo(
    () => (selected ? slotsToHoursMap(selected.slots) : new Map<string, Set<number>>()),
    [selected]
  );

  const getHours = (dateStr: string) => hoursMap.get(dateStr) ?? new Set<number>();

  function shiftWeek(delta: number) {
    const d = new Date(monday);
    d.setDate(d.getDate() + delta * 7);
    setMonday(getMondayOfWeek(d));
  }

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Availability overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View each official&apos;s submitted hours — same layout they see on My Availability.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Official picker */}
          <aside className="lg:w-64 flex-shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search official…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="rounded-xl border border-border overflow-hidden max-h-[min(70vh,520px)] overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : isError ? (
                <p className="p-4 text-sm text-destructive">Could not load officials.</p>
              ) : officials.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No officials found.</p>
              ) : (
                <ul>
                  {officials.map((o) => {
                    const active = o.official_id === selected?.official_id;
                    const slotCount = o.slots.reduce(
                      (n, s) => n + (s.time_slots?.length ?? 0),
                      0
                    );
                    return (
                      <li key={o.official_id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(o.official_id)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                            active
                              ? "bg-primary/10 border-l-2 border-l-primary"
                              : "hover:bg-muted/40 border-l-2 border-l-transparent"
                          )}
                        >
                          <p className="text-sm font-medium truncate">
                            {o.full_name ?? o.email}
                          </p>
                          {o.zone_id && zoneMap[o.zone_id] ? (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {zoneMap[o.zone_id]}
                            </p>
                          ) : null}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {slotCount > 0
                              ? `${slotCount} hour${slotCount !== 1 ? "s" : ""} this week`
                              : "No hours submitted"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Week grid (read-only) */}
          <div className="flex-1 min-w-0 space-y-3">
            {selected ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {selected.full_name ?? selected.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.zone_id && zoneMap[selected.zone_id]
                        ? zoneMap[selected.zone_id]
                        : "No home zone"}
                      {" · "}
                      Read-only view
                    </p>
                  </div>
                </div>
                <AvailabilityWeekGrid
                  weekMonday={monday}
                  onPrevWeek={() => shiftWeek(-7)}
                  onNextWeek={() => shiftWeek(7)}
                  getHours={getHours}
                  readOnly
                  footerNote="Checked boxes are hours this official marked as available."
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center rounded-xl border border-dashed border-border">
                Select an official to view their availability.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
