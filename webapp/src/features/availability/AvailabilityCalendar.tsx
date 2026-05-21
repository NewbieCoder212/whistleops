import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AvailabilitySlot } from "@shared/types";
import { AvailabilityWeekGrid } from "./AvailabilityWeekGrid";
import {
  ALL_HOURS,
  getMondayOfWeek,
  getWeekDates,
  toYMD,
} from "./availabilityConstants";

interface AvailabilityCalendarProps {
  gameCounts?: Record<string, number>;
  onWeekChange?: (start: string, end: string) => void;
}

export function AvailabilityCalendar({ gameCounts = {}, onWeekChange }: AvailabilityCalendarProps) {
  const { data: windowData } = useQuery({
    queryKey: ["availability", "window"],
    queryFn: () =>
      api.get<{ window: { open_date?: string | null; close_date?: string | null } }>(
        "/api/availability/window"
      ),
  });
  const availWindow = windowData?.window;

  const today = new Date();
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(today));
  const weekDates = getWeekDates(weekMonday);
  const startDate = weekDates[0]!;
  const endDate = weekDates[6]!;

  const qc = useQueryClient();
  const queryKey = ["availability", "week", startDate];

  const { data: serverSlots = [] } = useQuery<AvailabilitySlot[]>({
    queryKey,
    queryFn: () =>
      api.get<AvailabilitySlot[]>(`/api/availability?start=${startDate}&end=${endDate}`),
  });

  const [localMap, setLocalMap] = useState<Map<string, Set<number>>>(new Map());
  const pendingDates = useRef(new Set<string>());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function getHours(dateStr: string): Set<number> {
    if (localMap.has(dateStr)) return localMap.get(dateStr)!;
    const slot = serverSlots.find((s) => s.date === dateStr);
    return new Set(slot?.time_slots ?? []);
  }

  const mutation = useMutation({
    mutationFn: ({ date, time_slots }: { date: string; time_slots: number[] }) =>
      api.put<AvailabilitySlot>(`/api/availability/${date}`, { time_slots }),
    onSuccess: (_, { date }) => {
      pendingDates.current.delete(date);
      qc.invalidateQueries({ queryKey });
    },
  });

  const schedulesSave = useCallback(
    (dateStr: string, slots: Set<number>) => {
      pendingDates.current.add(dateStr);
      const existing = timers.current.get(dateStr);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        mutation.mutate({ date: dateStr, time_slots: Array.from(slots) });
        timers.current.delete(dateStr);
      }, 400);
      timers.current.set(dateStr, t);
    },
    [mutation]
  );

  function updateSlots(dateStr: string, updater: (prev: Set<number>) => Set<number>) {
    const prev = getHours(dateStr);
    const next = updater(new Set(prev));
    setLocalMap((m) => new Map(m).set(dateStr, next));
    schedulesSave(dateStr, next);
  }

  function toggleHour(dateStr: string, hour: number) {
    updateSlots(dateStr, (prev) => {
      const n = new Set(prev);
      if (n.has(hour)) n.delete(hour);
      else n.add(hour);
      return n;
    });
  }

  function togglePeriod(dateStr: string, periodHours: number[]) {
    updateSlots(dateStr, (prev) => {
      const allOn = periodHours.every((h) => prev.has(h));
      const n = new Set(prev);
      if (allOn) periodHours.forEach((h) => n.delete(h));
      else periodHours.forEach((h) => n.add(h));
      return n;
    });
  }

  function toggleAllDay(dateStr: string) {
    updateSlots(dateStr, (prev) => {
      const allOn = ALL_HOURS.every((h) => prev.has(h));
      if (allOn) return new Set<number>();
      return new Set(ALL_HOURS);
    });
  }

  function shiftWeek(delta: number) {
    setLocalMap(new Map());
    setWeekMonday((m) => {
      const d = new Date(m);
      d.setDate(d.getDate() + delta * 7);
      onWeekChange?.(toYMD(d), toYMD(new Date(d.getTime() + 6 * 86400000)));
      return d;
    });
  }

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
      <AvailabilityWeekGrid
        weekMonday={weekMonday}
        onPrevWeek={() => shiftWeek(-7)}
        onNextWeek={() => shiftWeek(7)}
        getHours={getHours}
        gameCounts={gameCounts}
        onToggleHour={toggleHour}
        onTogglePeriod={togglePeriod}
        onToggleAllDay={toggleAllDay}
        footerNote='Changes save automatically. "All" selects every hour in that group.'
      />
    </div>
  );
}
