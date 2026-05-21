import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AvailabilityDateNav } from "@/features/availability/AvailabilityDateNav";
import { AvailabilityDayMatrix } from "@/features/availability/AvailabilityDayMatrix";
import { AvailabilityWeekGrid } from "@/features/availability/AvailabilityWeekGrid";
import {
  getMondayOfWeek,
  getWeekDates,
  slotsToHoursMap,
  formatDayLabel,
  todayYmd,
} from "@/features/availability/availabilityConstants";
import { shiftWeekBlockDates } from "@/features/availability/availabilityNavigation";
import {
  countAvailableHoursOnDate,
  hasSubmissionForDate,
  resolveOverviewHourStatus,
  bookedHoursForDate,
  type OverviewOfficialRow,
} from "@/features/availability/availabilityOverviewUtils";
import { formatHourLabel } from "@/features/assignBoard/assignBoardUtils";
import {
  resolveDefaultZoneId,
  saveZonePreference,
  zoneSelectLabel,
} from "@/features/filters/scheduleFilterUtils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Zone } from "@shared/types";

export default function AvailabilityOverview() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const zoneInitialized = useRef(false);

  const [monday, setMonday] = useState(() => getMondayOfWeek(new Date()));
  const [focusDate, setFocusDate] = useState(() => todayYmd());
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightHour, setHighlightHour] = useState<number | null>(null);
  const [weekDetailOpen, setWeekDetailOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDates(monday), [monday]);
  const start = weekDates[0]!;
  const end = weekDates[6]!;

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile || zoneInitialized.current || zones.length === 0) return;
    zoneInitialized.current = true;
    const id = resolveDefaultZoneId({
      userId: user?.id,
      profileZoneId: profile.zone_id,
      role: profile.role,
      zoneIds: zones.map((z) => z.id),
    });
    setZoneId(id);
  }, [profile, user?.id, zones]);

  const overviewUrl = useMemo(() => {
    const qs = new URLSearchParams({ start, end });
    if (zoneId) qs.set("zoneId", zoneId);
    return `/api/availability/overview?${qs.toString()}`;
  }, [start, end, zoneId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["availability", "overview", start, end, zoneId ?? "all"],
    queryFn: () => api.get<{ officials: OverviewOfficialRow[] }>(overviewUrl),
  });

  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.name])),
    [zones]
  );

  const officials = data?.officials ?? [];

  const selected =
    officials.find((o) => o.official_id === selectedId) ?? officials[0] ?? null;

  useEffect(() => {
    if (!weekDates.includes(focusDate)) {
      setFocusDate(weekDates[0]!);
    }
  }, [weekDates, focusDate]);

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

  const summary = useMemo(() => {
    let submitted = 0;
    let totalHours = 0;
    let availableAtHour = 0;
    for (const o of officials) {
      if (hasSubmissionForDate(o.slots, focusDate)) submitted++;
      totalHours += countAvailableHoursOnDate(o, focusDate);
      if (highlightHour != null) {
        if (resolveOverviewHourStatus(o, focusDate, highlightHour) === "available") {
          availableAtHour++;
        }
      }
    }
    return { submitted, totalHours, availableAtHour, total: officials.length };
  }, [officials, focusDate, highlightHour]);

  function shiftWeekBlock(deltaWeeks: number) {
    const next = shiftWeekBlockDates(focusDate, monday, deltaWeeks);
    setFocusDate(next.focusDate);
    setMonday(next.weekMonday);
  }

  const handleZoneChange = (value: string) => {
    const next = value === "all" ? null : value;
    setZoneId(next);
    saveZonePreference(user?.id, next);
  };

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1600px]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Availability overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day matrix shows every official at once for staffing. Arrows move one day; data loads by
            calendar week (Mon–Sun).
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <AvailabilityDateNav
            focusDate={focusDate}
            weekMonday={monday}
            onFocusDateChange={setFocusDate}
            onWeekMondayChange={setMonday}
            className="flex-1 min-w-[280px] border-0 bg-transparent p-0"
          />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Zone
            </span>
            <Select value={zoneId ?? "all"} onValueChange={handleZoneChange}>
              <SelectTrigger className="h-8 min-w-[160px] text-xs">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {zoneSelectLabel(z.name, z.id, profile?.zone_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        {!isLoading && !isError && officials.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground rounded-lg border border-border bg-card px-4 py-2.5">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{summary.total}</span>{" "}
              officials
              {zoneId && zoneMap[zoneId] ? ` · ${zoneMap[zoneId]}` : ""}
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{summary.submitted}</span>{" "}
              submitted for {formatDayLabel(focusDate).split(",")[0]}
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{summary.totalHours}</span>{" "}
              available hours total
            </span>
            {highlightHour != null ? (
              <span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {summary.availableAtHour}
                </span>{" "}
                available at {formatHourLabel(highlightHour)}
              </span>
            ) : (
              <span className="italic">Click an hour column header to filter</span>
            )}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading availability…</p>
        ) : isError ? (
          <p className="text-sm text-destructive py-12 text-center">Could not load availability.</p>
        ) : officials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center rounded-xl border border-dashed border-border">
            No officials in this zone for the selected week.
          </p>
        ) : (
          <AvailabilityDayMatrix
            officials={officials}
            dateStr={focusDate}
            zoneMap={zoneMap}
            selectedOfficialId={selectedId}
            onSelectOfficial={(id) => {
              setSelectedId(id);
              setWeekDetailOpen(true);
            }}
            highlightHour={highlightHour}
            onHourClick={(h) =>
              setHighlightHour((prev) => (prev === h ? null : h))
            }
          />
        )}

        {selected ? (
          <Collapsible open={weekDetailOpen} onOpenChange={setWeekDetailOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground w-full rounded-lg border border-border px-4 py-2.5 bg-muted/20">
              <User className="h-3.5 w-3.5" />
              Week view — {selected.full_name ?? selected.email}
              <span className="ml-auto text-[10px] font-normal normal-case">
                {weekDetailOpen ? "Collapse" : "Expand"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <AvailabilityWeekGrid
                  weekMonday={monday}
                  onPrevWeek={() => shiftWeekBlock(-1)}
                  onNextWeek={() => shiftWeekBlock(1)}
                  getHours={(dateStr) => hoursMap.get(dateStr) ?? new Set()}
                  getBookedHours={(dateStr) =>
                    selected ? bookedHoursForDate(selected, dateStr) : new Set()
                  }
                  focusDate={focusDate}
                  readOnly
                  footerNote="Full week for this official. Red hours are game assignments (read-only)."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </AdminLayout>
  );
}
