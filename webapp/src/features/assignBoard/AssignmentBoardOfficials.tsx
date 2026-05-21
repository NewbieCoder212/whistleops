import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AssignBoardGame, AssignBoardOfficial } from "@shared/types";
import {
  PERIODS,
  displayHour,
} from "@/features/availability/availabilityConstants";
import { resolveOfficialAvailabilityStatus } from "./assignBoardUtils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function cellClass(status: ReturnType<typeof resolveOfficialAvailabilityStatus>, assignedHere: boolean): string {
  if (assignedHere || status === "busy") return "bg-red-500/25 border-red-500/40";
  switch (status) {
    case "available":
      return "bg-emerald-500/20 border-emerald-500/30";
    case "no_submission":
      return "bg-muted/40 border-border";
    default:
      return "bg-background border-border/60";
  }
}

const BOOKED_STATUSES = new Set(["DRAFT", "PENDING", "CONFIRMED"]);

function blockedHoursForOfficial(
  official: AssignBoardOfficial,
  games?: AssignBoardGame[]
): Set<number> {
  const hours = new Set(official.busy_hours);
  if (!games) return hours;
  for (const game of games) {
    for (const slot of game.slots) {
      const a = slot.assignment;
      if (!a || !BOOKED_STATUSES.has(a.status)) continue;
      if (a.official_id !== official.official_id) continue;
      hours.add(game.game_hour);
    }
  }
  return hours;
}

interface AssignmentBoardOfficialsProps {
  officials: AssignBoardOfficial[];
  games?: AssignBoardGame[];
  highlightHour: number | null;
  highlightOfficialId: string | null;
  defaultOpen: boolean;
  onHourClick: (hour: number) => void;
  onHourHover: (hour: number | null, officialId: string | null) => void;
}

export function AssignmentBoardOfficials({
  officials,
  games,
  highlightHour,
  highlightOfficialId,
  defaultOpen,
  onHourClick,
  onHourHover,
}: AssignmentBoardOfficialsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [search, setSearch] = useState("");
  const [hideNoSubmission, setHideNoSubmission] = useState(false);
  const [onlyAvailableAtHour, setOnlyAvailableAtHour] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return officials.filter((official) => {
      if (q) {
        const name = (official.full_name ?? official.email).toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (hideNoSubmission && official.time_slots.length === 0) return false;
      if (onlyAvailableAtHour && highlightHour != null) {
        const status = resolveOfficialAvailabilityStatus(official, highlightHour);
        if (status !== "available") return false;
      }
      return true;
    });
  }, [officials, search, hideNoSubmission, onlyAvailableAtHour, highlightHour]);

  if (officials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center rounded-xl border border-dashed border-border">
        No officials in this zone.
      </p>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          Full availability grid ({officials.length} officials)
        </CollapsibleTrigger>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search official…"
            className="h-7 w-[140px] text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="hide-no-sub"
              checked={hideNoSubmission}
              onCheckedChange={(v) => setHideNoSubmission(v === true)}
            />
            <Label htmlFor="hide-no-sub" className="text-[10px] font-normal cursor-pointer">
              Hide no submission
            </Label>
          </div>
          {highlightHour != null ? (
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="only-avail-hour"
                checked={onlyAvailableAtHour}
                onCheckedChange={(v) => setOnlyAvailableAtHour(v === true)}
              />
              <Label htmlFor="only-avail-hour" className="text-[10px] font-normal cursor-pointer">
                Available at {displayHour(highlightHour)} only
              </Label>
            </div>
          ) : null}
        </div>
      </div>

      <CollapsibleContent>
        <div className="overflow-x-auto rounded-xl border border-border">
          <ScrollArea className="h-[400px]">
            <table className="w-full border-collapse text-xs select-none" style={{ minWidth: 720 }}>
              <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-30 bg-muted/95 min-w-[160px] px-3 py-2 text-left font-semibold">
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
                </tr>
                <tr className="border-b border-border bg-muted/80">
                  <th className="sticky left-0 z-30 bg-muted/80" />
                  {PERIODS.map(({ hours }) =>
                    hours.map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "w-7 px-0.5 py-1 text-center font-medium text-muted-foreground border-l border-border/40 cursor-pointer hover:bg-primary/10",
                          highlightHour === h && "bg-primary/15 text-primary"
                        )}
                        onClick={() => onHourClick(h)}
                      >
                        {displayHour(h)}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((official) => {
                  const rowHighlight = highlightOfficialId === official.official_id;
                  const blockedHours = blockedHoursForOfficial(official, games);

                  return (
                    <tr
                      key={official.official_id}
                      className={cn(
                        "border-b border-border/50 last:border-0",
                        rowHighlight && "bg-primary/5"
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium max-w-[180px]">
                        <span className="truncate block">{official.full_name ?? official.email}</span>
                        {official.official_level_name ? (
                          <span className="text-[9px] text-muted-foreground block truncate">
                            {official.official_level_name}
                          </span>
                        ) : null}
                      </td>
                      {PERIODS.map(({ hours }) =>
                        hours.map((hour) => {
                          const isBlocked = blockedHours.has(hour);
                          const status = isBlocked
                            ? "busy"
                            : resolveOfficialAvailabilityStatus(official, hour);
                          const assignedHere = isBlocked;
                          const cellHighlight = highlightHour === hour;

                          return (
                            <td
                              key={hour}
                              className="p-0.5 border-l border-border/30"
                              onMouseEnter={() => onHourHover(hour, official.official_id)}
                              onMouseLeave={() => onHourHover(null, null)}
                            >
                              <div
                                className={cn(
                                  "h-5 w-full rounded-sm border mx-auto max-w-[28px]",
                                  cellClass(status, assignedHere),
                                  cellHighlight && "ring-1 ring-primary/50"
                                )}
                                title={
                                  status === "busy" || assignedHere
                                    ? "Assigned to a game"
                                    : status
                                }
                              />
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No officials match filters.</p>
            ) : null}
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
