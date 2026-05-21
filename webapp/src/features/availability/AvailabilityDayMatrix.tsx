import { useMemo, useState } from "react";
import {
  PERIODS,
  displayHour,
} from "@/features/availability/availabilityConstants";
import {
  type OverviewOfficialRow,
  matrixCellClass,
  resolveOverviewHourStatus,
  countAvailableHoursOnDate,
} from "./availabilityOverviewUtils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AvailabilityDayMatrixProps {
  officials: OverviewOfficialRow[];
  dateStr: string;
  zoneMap: Record<string, string>;
  selectedOfficialId: string | null;
  onSelectOfficial: (id: string) => void;
  highlightHour: number | null;
  onHourClick: (hour: number) => void;
}

export function AvailabilityDayMatrix({
  officials,
  dateStr,
  zoneMap,
  selectedOfficialId,
  onSelectOfficial,
  highlightHour,
  onHourClick,
}: AvailabilityDayMatrixProps) {
  const [search, setSearch] = useState("");
  const [hideNoSubmission, setHideNoSubmission] = useState(false);
  const [onlyAvailableAtHour, setOnlyAvailableAtHour] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return officials.filter((o) => {
      if (q) {
        const name = (o.full_name ?? o.email).toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (hideNoSubmission && !o.slots.some((s) => s.date === dateStr)) return false;
      if (onlyAvailableAtHour && highlightHour != null) {
        if (resolveOverviewHourStatus(o, dateStr, highlightHour) !== "available") {
          return false;
        }
      }
      return true;
    });
  }, [officials, search, hideNoSubmission, onlyAvailableAtHour, highlightHour, dateStr]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search official…"
          className="h-8 w-full sm:w-[200px] text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="av-hide-no-sub"
            checked={hideNoSubmission}
            onCheckedChange={(v) => setHideNoSubmission(v === true)}
          />
          <Label htmlFor="av-hide-no-sub" className="text-xs font-normal cursor-pointer">
            Hide no submission this day
          </Label>
        </div>
        {highlightHour != null ? (
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="av-only-hour"
              checked={onlyAvailableAtHour}
              onCheckedChange={(v) => setOnlyAvailableAtHour(v === true)}
            />
            <Label htmlFor="av-only-hour" className="text-xs font-normal cursor-pointer">
              Available at {displayHour(highlightHour)} only
            </Label>
          </div>
        ) : null}
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          Showing {filtered.length} of {officials.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-5 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
          Available
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-5 rounded-sm bg-red-500/30 border border-red-500/40" />
          Assigned (game)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-5 rounded-sm bg-background border border-border" />
          Submitted · not this hour
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-5 rounded-sm bg-muted/50 border border-dashed border-border" />
          No submission
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <ScrollArea className="h-[min(65vh,560px)]">
          <table className="w-full border-collapse text-xs select-none" style={{ minWidth: 720 }}>
            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-muted/95 min-w-[180px] max-w-[220px] px-3 py-2 text-left font-semibold">
                  Official
                </th>
                {PERIODS.map(({ label, hours }) => (
                  <th
                    key={label}
                    colSpan={hours.length}
                    className="px-1 py-2 text-center font-semibold tracking-wide border-l border-border"
                  >
                    {label}
                  </th>
                ))}
                <th className="w-10 px-2 py-2 text-center font-semibold border-l border-border bg-muted/80">
                  Hrs
                </th>
              </tr>
              <tr className="border-b border-border bg-muted/80">
                <th className="sticky left-0 z-30 bg-muted/80" />
                {PERIODS.map(({ hours }) =>
                  hours.map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "w-7 px-0.5 py-1 text-center font-medium text-muted-foreground border-l border-border/40 cursor-pointer hover:bg-primary/10",
                        highlightHour === h && "bg-primary/15 text-primary font-semibold"
                      )}
                      onClick={() => onHourClick(h)}
                    >
                      {displayHour(h)}
                    </th>
                  ))
                )}
                <th className="border-l border-border bg-muted/80" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const active = o.official_id === selectedOfficialId;
                const availCount = countAvailableHoursOnDate(o, dateStr);

                return (
                  <tr
                    key={o.official_id}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      active && "bg-primary/5"
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectOfficial(o.official_id)}
                        className={cn(
                          "w-full text-left rounded-md px-2 py-1 transition-colors hover:bg-muted/50",
                          active && "bg-primary/10"
                        )}
                      >
                        <span className="text-sm font-medium truncate block">
                          {o.full_name ?? o.email}
                        </span>
                        {o.zone_id && zoneMap[o.zone_id] ? (
                          <span className="text-[9px] text-muted-foreground truncate block">
                            {zoneMap[o.zone_id]}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    {PERIODS.map(({ hours }) =>
                      hours.map((hour) => {
                        const status = resolveOverviewHourStatus(o, dateStr, hour);
                        return (
                          <td key={hour} className="p-0.5 border-l border-border/30">
                            <div
                              className={cn(
                                "h-5 w-full rounded-sm border mx-auto max-w-[28px]",
                                matrixCellClass(status),
                                highlightHour === hour && "ring-1 ring-primary/50"
                              )}
                              title={
                                status === "booked"
                                  ? "Assigned to a game"
                                  : status.replaceAll("_", " ")
                              }
                            />
                          </td>
                        );
                      })
                    )}
                    <td className="text-center tabular-nums text-muted-foreground border-l border-border font-medium">
                      {availCount > 0 ? availCount : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No officials match the current filters.
            </p>
          ) : null}
        </ScrollArea>
      </div>
    </div>
  );
}
