import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AvailabilitySlot } from "@shared/types";

type OverviewOfficial = {
  official_id: string;
  full_name: string | null;
  email: string;
  zone_id: string | null;
  slots: AvailabilitySlot[];
};

function getMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toYMD(d);
  });
}

export default function AvailabilityOverview() {
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [search, setSearch] = useState("");
  const weekDates = useMemo(() => getWeekDates(monday), [monday]);
  const start = weekDates[0]!;
  const end = weekDates[6]!;

  const { data, isLoading } = useQuery({
    queryKey: ["availability", "overview", start, end],
    queryFn: () =>
      api.get<{ officials: OverviewOfficial[] }>(
        `/api/availability/overview?start=${start}&end=${end}`
      ),
  });

  const officials = useMemo(() => {
    const list = data?.officials ?? [];
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.full_name?.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const slotMap = (o: OverviewOfficial) => {
    const m = new Map<string, AvailabilitySlot>();
    for (const s of o.slots) m.set(s.date, s);
    return m;
  };

  const shiftWeek = (delta: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + delta * 7);
    setMonday(getMonday(d));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Availability overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all officials&apos; submitted availability for the selected week.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums">
            {start} — {end}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Search official…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-xs ml-auto"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 font-medium sticky left-0 bg-muted/30 min-w-[160px]">
                    Official
                  </th>
                  {weekDates.map((d) => (
                    <th key={d} className="p-2 font-medium text-center min-w-[72px]">
                      {new Date(d + "T12:00:00").toLocaleDateString("en-CA", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officials.map((o) => {
                  const slots = slotMap(o);
                  return (
                    <tr key={o.official_id} className="border-b border-border/50">
                      <td className="p-2 font-medium sticky left-0 bg-card">
                        {o.full_name ?? o.email}
                      </td>
                      {weekDates.map((d) => {
                        const slot = slots.get(d);
                        const hours = slot?.time_slots?.length ?? 0;
                        const periods = [
                          slot?.morning && "AM",
                          slot?.afternoon && "PM",
                          slot?.evening && "Eve",
                        ].filter(Boolean);
                        return (
                          <td key={d} className="p-2 text-center text-muted-foreground">
                            {hours > 0 ? (
                              <span className="text-foreground font-medium">
                                {hours}h
                                {periods.length ? ` (${periods.join(",")})` : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
