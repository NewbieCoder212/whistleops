import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ALL_HOURS,
  PERIODS,
  displayHour,
  formatDayLabel,
  formatWeekRange,
  getWeekDates,
  todayYmd,
} from "./availabilityConstants";

function HourCell({
  checked,
  booked,
  readOnly,
  isAgg,
  onClick,
}: {
  checked: boolean;
  booked?: boolean;
  readOnly?: boolean;
  isAgg?: boolean;
  onClick?: () => void;
}) {
  const locked = booked || (readOnly && !isAgg);
  return (
    <td className={cn("p-0 text-center align-middle", isAgg ? "bg-muted/60" : "")}>
      <button
        type="button"
        disabled={locked}
        onClick={locked ? undefined : onClick}
        title={booked ? "Assigned to a game — cannot change" : undefined}
        className={cn(
          "mx-auto my-1.5 flex h-5 w-5 items-center justify-center rounded border transition-colors",
          booked && "bg-red-500/30 border-red-500/50 cursor-not-allowed",
          !booked && checked && "bg-primary border-primary",
          !booked && !checked && "bg-background border-border",
          !locked && !checked && !booked && "hover:border-primary/60",
          locked && !booked && "cursor-default opacity-100",
          isAgg && !checked && !booked && "bg-muted border-muted-foreground/30"
        )}
        aria-pressed={checked && !booked}
        aria-label={
          booked ? "Assigned to a game" : checked ? "Available" : "Unavailable"
        }
      >
        {checked && !booked ? (
          <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : booked ? (
          <span className="text-[8px] font-bold text-red-800 dark:text-red-200">G</span>
        ) : null}
      </button>
    </td>
  );
}

export interface AvailabilityWeekGridProps {
  weekMonday: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  getHours: (dateStr: string) => Set<number>;
  /** Hours blocked by game assignments (DRAFT/PENDING/CONFIRMED). */
  getBookedHours?: (dateStr: string) => Set<number>;
  readOnly?: boolean;
  gameCounts?: Record<string, number>;
  /** Highlight the day the user is focused on (admin matrix / day nav). */
  focusDate?: string;
  onToggleHour?: (dateStr: string, hour: number) => void;
  onTogglePeriod?: (dateStr: string, periodHours: number[]) => void;
  onToggleAllDay?: (dateStr: string) => void;
  footerNote?: string;
}

export function AvailabilityWeekGrid({
  weekMonday,
  onPrevWeek,
  onNextWeek,
  getHours,
  getBookedHours,
  readOnly = false,
  gameCounts = {},
  focusDate,
  onToggleHour,
  onTogglePeriod,
  onToggleAllDay,
  footerNote,
}: AvailabilityWeekGridProps) {
  const weekDates = getWeekDates(weekMonday);
  const todayStr = todayYmd();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onPrevWeek} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{formatWeekRange(weekMonday)}</span>
        <Button variant="ghost" size="icon" onClick={onNextWeek} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-xs select-none" style={{ minWidth: 640 }}>
          <thead>
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
              <th className="px-2 py-2 text-center font-semibold bg-muted/60 border-l border-border" />
            </tr>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-1.5 text-left text-muted-foreground" />
              {PERIODS.map(({ hours }) => (
                <PeriodHourHeaders key={hours[0]} hours={hours} />
              ))}
              <th className="w-9 px-1 py-1.5 text-center font-semibold text-muted-foreground bg-muted/60 border-l border-border">
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {weekDates.map((dateStr) => {
              const hours = getHours(dateStr);
              const booked = getBookedHours?.(dateStr) ?? new Set<number>();
              const isToday = dateStr === todayStr;
              const isFocus = focusDate != null && dateStr === focusDate;
              const allDayOn = ALL_HOURS.every(
                (h) => hours.has(h) && !booked.has(h)
              );

              return (
                <tr
                  key={dateStr}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    isToday && "bg-yellow-50 dark:bg-yellow-900/10",
                    !isToday && isFocus && "bg-primary/5 ring-1 ring-inset ring-primary/15",
                    !isToday && !isFocus && "hover:bg-muted/20"
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isToday ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"
                        )}
                      >
                        {formatDayLabel(dateStr)}
                      </span>
                      {gameCounts[dateStr] ? (
                        <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                          {gameCounts[dateStr]}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {PERIODS.map(({ hours: periodHours }) => {
                    const allPeriodOn = periodHours.every(
                      (h) => hours.has(h) && !booked.has(h)
                    );
                    return (
                      <PeriodRowCells
                        key={periodHours[0]}
                        periodHours={periodHours}
                        hours={hours}
                        booked={booked}
                        readOnly={readOnly}
                        allPeriodOn={allPeriodOn}
                        dateStr={dateStr}
                        onToggleHour={onToggleHour}
                        onTogglePeriod={onTogglePeriod}
                      />
                    );
                  })}

                  <HourCell
                    checked={allDayOn}
                    booked={false}
                    readOnly={readOnly}
                    isAgg
                    onClick={onToggleAllDay ? () => onToggleAllDay(dateStr) : undefined}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {footerNote ? (
        <p className="text-[11px] text-muted-foreground text-center">{footerNote}</p>
      ) : null}
    </div>
  );
}

function PeriodHourHeaders({ hours }: { hours: readonly number[] }) {
  return (
    <>
      {hours.map((h) => (
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
  );
}

function PeriodRowCells({
  periodHours,
  hours,
  booked,
  readOnly,
  allPeriodOn,
  dateStr,
  onToggleHour,
  onTogglePeriod,
}: {
  periodHours: readonly number[];
  hours: Set<number>;
  booked: Set<number>;
  readOnly: boolean;
  allPeriodOn: boolean;
  dateStr: string;
  onToggleHour?: (dateStr: string, hour: number) => void;
  onTogglePeriod?: (dateStr: string, periodHours: number[]) => void;
}) {
  return (
    <>
      {periodHours.map((h) => (
        <HourCell
          key={h}
          checked={hours.has(h)}
          booked={booked.has(h)}
          readOnly={readOnly}
          onClick={onToggleHour ? () => onToggleHour(dateStr, h) : undefined}
        />
      ))}
      <HourCell
        checked={allPeriodOn}
        booked={false}
        readOnly={readOnly}
        isAgg
        onClick={
          onTogglePeriod ? () => onTogglePeriod(dateStr, [...periodHours]) : undefined
        }
      />
    </>
  );
}
