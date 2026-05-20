import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@shared/types";

// ─── Hour definitions ─────────────────────────────────────────────────────────
const MORNING_HOURS   = [7, 8, 9, 10, 11];
const AFTERNOON_HOURS = [12, 13, 14, 15, 16];
const EVENING_HOURS   = [17, 18, 19, 20, 21, 22, 23, 0];
const ALL_HOURS       = [...MORNING_HOURS, ...AFTERNOON_HOURS, ...EVENING_HOURS];

const PERIODS = [
  { label: "Morning",   hours: MORNING_HOURS },
  { label: "Afternoon", hours: AFTERNOON_HOURS },
  { label: "Evening",   hours: EVENING_HOURS },
];

function displayHour(h: number): string {
  if (h === 0)  return "12";
  if (h <= 12)  return String(h);
  return String(h - 12);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toYMD(d);
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const mo = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const su = sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${mo} – ${su}, ${sunday.getFullYear()}`;
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function HourCheckbox({
  checked,
  onChange,
  isAgg,
}: {
  checked: boolean;
  onChange: () => void;
  isAgg?: boolean;
}) {
  return (
    <td
      className={cn(
        "p-0 text-center align-middle",
        isAgg ? "bg-muted/60" : ""
      )}
    >
      <button
        onClick={onChange}
        className={cn(
          "mx-auto my-1.5 flex h-5 w-5 items-center justify-center rounded border transition-colors",
          checked
            ? "bg-primary border-primary"
            : "bg-background border-border hover:border-primary/60",
          isAgg && !checked && "bg-muted border-muted-foreground/30 hover:border-primary/60"
        )}
        aria-pressed={checked}
      >
        {checked ? (
          <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
    </td>
  );
}

interface AvailabilityCalendarProps {
  gameCounts?: Record<string, number>;
  onWeekChange?: (start: string, end: string) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AvailabilityCalendar({ gameCounts = {}, onWeekChange }: AvailabilityCalendarProps) {
  const { data: windowData } = useQuery({
    queryKey: ["availability", "window"],
    queryFn: () => api.get<{ window: { open_date?: string | null; close_date?: string | null } }>(
      "/api/availability/window"
    ),
  });
  const availWindow = windowData?.window;

  const today = new Date();
  const todayStr = toYMD(today);

  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(today));
  const weekDates = getWeekDates(weekMonday);
  const startDate = weekDates[0];
  const endDate   = weekDates[6];

  const qc = useQueryClient();
  const queryKey = ["availability", "week", startDate];

  const { data: serverSlots = [] } = useQuery<AvailabilitySlot[]>({
    queryKey,
    queryFn: () =>
      api.get<AvailabilitySlot[]>(`/api/availability?start=${startDate}&end=${endDate}`),
  });

  // Local state: dateStr → Set of selected hours (for instant visual feedback)
  const [localMap, setLocalMap] = useState<Map<string, Set<number>>>(new Map());

  // Sync local map when server data changes (only for dates not currently being edited)
  const pendingDates = useRef(new Set<string>());

  function getHours(dateStr: string): Set<number> {
    if (localMap.has(dateStr)) return localMap.get(dateStr)!;
    const slot = serverSlots.find(s => s.date === dateStr);
    return new Set(slot?.time_slots ?? []);
  }

  // Debounced saves: one timer per date
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const mutation = useMutation({
    mutationFn: ({ date, time_slots }: { date: string; time_slots: number[] }) =>
      api.put<AvailabilitySlot>(`/api/availability/${date}`, { time_slots }),
    onSuccess: (_, { date }) => {
      pendingDates.current.delete(date);
      qc.invalidateQueries({ queryKey });
    },
  });

  const schedulesSave = useCallback((dateStr: string, slots: Set<number>) => {
    pendingDates.current.add(dateStr);
    const existing = timers.current.get(dateStr);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      mutation.mutate({ date: dateStr, time_slots: Array.from(slots) });
      timers.current.delete(dateStr);
    }, 400);
    timers.current.set(dateStr, t);
  }, [mutation]);

  function updateSlots(dateStr: string, updater: (prev: Set<number>) => Set<number>) {
    const prev = getHours(dateStr);
    const next = updater(new Set(prev));
    setLocalMap(m => new Map(m).set(dateStr, next));
    schedulesSave(dateStr, next);
  }

  function toggleHour(dateStr: string, hour: number) {
    updateSlots(dateStr, prev => {
      const n = new Set(prev);
      if (n.has(hour)) n.delete(hour); else n.add(hour);
      return n;
    });
  }

  function togglePeriod(dateStr: string, periodHours: number[]) {
    updateSlots(dateStr, prev => {
      const allOn = periodHours.every(h => prev.has(h));
      const n = new Set(prev);
      if (allOn) periodHours.forEach(h => n.delete(h));
      else periodHours.forEach(h => n.add(h));
      return n;
    });
  }

  function toggleAllDay(dateStr: string) {
    updateSlots(dateStr, prev => {
      const allOn = ALL_HOURS.every(h => prev.has(h));
      if (allOn) return new Set<number>();
      return new Set(ALL_HOURS);
    });
  }

  function prevWeek() {
    setLocalMap(new Map());
    setWeekMonday(m => {
      const d = new Date(m);
      d.setDate(d.getDate() - 7);
      onWeekChange?.(toYMD(d), toYMD(new Date(d.getTime() + 6 * 86400000)));
      return d;
    });
  }

  function nextWeek() {
    setLocalMap(new Map());
    setWeekMonday(m => {
      const d = new Date(m);
      d.setDate(d.getDate() + 7);
      onWeekChange?.(toYMD(d), toYMD(new Date(d.getTime() + 6 * 86400000)));
      return d;
    });
  }

  // Notify parent whenever the visible week changes (including on mount)
  useEffect(() => {
    onWeekChange?.(startDate, endDate);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const windowBanner =
    availWindow?.open_date || availWindow?.close_date ? (
      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
        Availability submissions allowed
        {availWindow.open_date ? ` from ${availWindow.open_date}` : ""}
        {availWindow.close_date ? ` through ${availWindow.close_date}` : ""}.
      </p>
    ) : null;

  return (
    <div className="space-y-4">
      {windowBanner}
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{formatWeekRange(weekMonday)}</span>
        <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Horizontally scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-xs select-none" style={{ minWidth: 640 }}>
          <thead>
            {/* Period group headers */}
            <tr className="border-b border-border bg-muted/40">
              <th className="w-44 min-w-[140px] px-3 py-2 text-left font-medium text-muted-foreground" />
              {PERIODS.map(({ label, hours }) => (
                <th
                  key={label}
                  colSpan={hours.length + 1}
                  className="px-2 py-2 text-center font-semibold tracking-wide border-l border-border"
                >
                  {label}
                </th>
              ))}
              {/* Final All */}
              <th className="px-2 py-2 text-center font-semibold bg-muted/60 border-l border-border" />
            </tr>

            {/* Hour labels */}
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-1.5 text-left text-muted-foreground" />
              {PERIODS.map(({ hours }) => (
                <>
                  {hours.map(h => (
                    <th
                      key={h}
                      className="w-8 px-1 py-1.5 text-center font-medium text-muted-foreground border-l border-border/40"
                    >
                      {displayHour(h)}
                    </th>
                  ))}
                  <th className="w-9 px-1 py-1.5 text-center font-semibold text-muted-foreground bg-muted/60 border-l border-border">
                    All
                  </th>
                </>
              ))}
              <th className="w-9 px-1 py-1.5 text-center font-semibold text-muted-foreground bg-muted/60 border-l border-border">
                All
              </th>
            </tr>
          </thead>

          <tbody>
            {weekDates.map(dateStr => {
              const hours    = getHours(dateStr);
              const isToday  = dateStr === todayStr;
              const allDayOn = ALL_HOURS.every(h => hours.has(h));

              return (
                <tr
                  key={dateStr}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    isToday ? "bg-yellow-50 dark:bg-yellow-900/10" : "hover:bg-muted/20"
                  )}
                >
                  {/* Day label */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold",
                        isToday ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"
                      )}>
                        {formatDayLabel(dateStr)}
                      </span>
                      {gameCounts[dateStr] ? (
                        <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                          {gameCounts[dateStr]}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Period columns */}
                  {PERIODS.map(({ hours: periodHours }) => {
                    const allPeriodOn = periodHours.every(h => hours.has(h));
                    return (
                      <>
                        {periodHours.map(h => (
                          <HourCheckbox
                            key={h}
                            checked={hours.has(h)}
                            onChange={() => toggleHour(dateStr, h)}
                          />
                        ))}
                        <HourCheckbox
                          key={`all-${periodHours[0]}`}
                          checked={allPeriodOn}
                          onChange={() => togglePeriod(dateStr, periodHours)}
                          isAgg
                        />
                      </>
                    );
                  })}

                  {/* All Day */}
                  <HourCheckbox
                    checked={allDayOn}
                    onChange={() => toggleAllDay(dateStr)}
                    isAgg
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Changes save automatically. "All" selects every hour in that group.
      </p>
    </div>
  );
}
