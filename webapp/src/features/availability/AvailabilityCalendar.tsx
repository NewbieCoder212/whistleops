import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AvailabilitySlot, AvailabilityWeekBundle } from "@shared/types";
import { AvailabilityDateNav } from "./AvailabilityDateNav";
import { AvailabilityWeekGrid } from "./AvailabilityWeekGrid";
import {
  ALL_HOURS,
  getMondayOfWeek,
  getWeekDates,
  todayYmd,
} from "./availabilityConstants";
import { shiftWeekBlockDates } from "./availabilityNavigation";

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

  const [focusDate, setFocusDate] = useState(() => todayYmd());
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()));
  const weekDates = getWeekDates(weekMonday);
  const startDate = weekDates[0]!;
  const endDate = weekDates[6]!;

  const qc = useQueryClient();
  const queryKey = ["availability", "week", startDate];

  const { data: weekBundle } = useQuery<AvailabilityWeekBundle>({
    queryKey,
    queryFn: () =>
      api.get<AvailabilityWeekBundle>(`/api/availability?start=${startDate}&end=${endDate}`),
  });

  const serverSlots = weekBundle?.slots ?? [];
  const bookedByDate = weekBundle?.booked_hours ?? {};

  const [localMap, setLocalMap] = useState<Map<string, Set<number>>>(new Map());
  const pendingDates = useRef(new Set<string>());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const getBookedHours = useCallback(
    (dateStr: string) => new Set(bookedByDate[dateStr] ?? []),
    [bookedByDate]
  );

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
      const booked = getBookedHours(dateStr);
      const merged = new Set([...slots, ...booked]);
      const t = setTimeout(() => {
        mutation.mutate({ date: dateStr, time_slots: Array.from(merged) });
        timers.current.delete(dateStr);
      }, 400);
      timers.current.set(dateStr, t);
    },
    [mutation, getBookedHours]
  );

  function updateSlots(dateStr: string, updater: (prev: Set<number>) => Set<number>) {
    const prev = getHours(dateStr);
    const next = updater(new Set(prev));
    setLocalMap((m) => new Map(m).set(dateStr, next));
    schedulesSave(dateStr, next);
  }

  function toggleHour(dateStr: string, hour: number) {
    if (getBookedHours(dateStr).has(hour)) return;
    updateSlots(dateStr, (prev) => {
      const n = new Set(prev);
      if (n.has(hour)) n.delete(hour);
      else n.add(hour);
      return n;
    });
  }

  function togglePeriod(dateStr: string, periodHours: number[]) {
    const booked = getBookedHours(dateStr);
    const editable = periodHours.filter((h) => !booked.has(h));
    if (editable.length === 0) return;
    updateSlots(dateStr, (prev) => {
      const allOn = editable.every((h) => prev.has(h));
      const n = new Set(prev);
      if (allOn) editable.forEach((h) => n.delete(h));
      else editable.forEach((h) => n.add(h));
      return n;
    });
  }

  function toggleAllDay(dateStr: string) {
    const booked = getBookedHours(dateStr);
    const editable = ALL_HOURS.filter((h) => !booked.has(h));
    updateSlots(dateStr, (prev) => {
      const allOn = editable.every((h) => prev.has(h));
      if (allOn) {
        const n = new Set(prev);
        editable.forEach((h) => n.delete(h));
        return n;
      }
      const n = new Set(prev);
      editable.forEach((h) => n.add(h));
      return n;
    });
  }

  function shiftWeekBlock(deltaWeeks: number) {
    setLocalMap(new Map());
    const next = shiftWeekBlockDates(focusDate, weekMonday, deltaWeeks);
    setFocusDate(next.focusDate);
    setWeekMonday(next.weekMonday);
  }

  useEffect(() => {
    onWeekChange?.(startDate, endDate);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!weekDates.includes(focusDate)) {
      setFocusDate(weekDates[0]!);
    }
  }, [weekDates, focusDate]);

  const hasBookedHours = useMemo(
    () => Object.values(bookedByDate).some((hours) => hours.length > 0),
    [bookedByDate]
  );

  const windowBanner =
    availWindow?.open_date || availWindow?.close_date ? (
      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
        Availability submissions allowed
        {availWindow.open_date ? ` from ${availWindow.open_date}` : ""}
        {availWindow.close_date ? ` through ${availWindow.close_date}` : ""}.
      </p>
    ) : null;

  const bookedNote = hasBookedHours
    ? " Red cells are hours you are assigned to a game — you cannot change those."
    : "";

  return (
    <div className="space-y-4">
      {windowBanner}
      <AvailabilityDateNav
        focusDate={focusDate}
        weekMonday={weekMonday}
        onFocusDateChange={setFocusDate}
        onWeekMondayChange={setWeekMonday}
        onWeekBoundaryCross={() => setLocalMap(new Map())}
        className="rounded-lg border border-border bg-muted/30 px-3 py-3"
      />
      <AvailabilityWeekGrid
        weekMonday={weekMonday}
        onPrevWeek={() => shiftWeekBlock(-1)}
        onNextWeek={() => shiftWeekBlock(1)}
        getHours={getHours}
        getBookedHours={getBookedHours}
        focusDate={focusDate}
        gameCounts={gameCounts}
        onToggleHour={toggleHour}
        onTogglePeriod={togglePeriod}
        onToggleAllDay={toggleAllDay}
        footerNote={`Arrows above move one day. Edit hours below; changes save automatically.${bookedNote}`}
      />
    </div>
  );
}
