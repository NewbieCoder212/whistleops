import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso } from "@/features/filters/scheduleFilterUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDayLabelShort,
  formatWeekRange,
  getWeekDates,
  todayYmd,
  toYmdFromDate,
} from "./availabilityConstants";
import { mondayOnOrBefore, shiftWeekBlockDates } from "./availabilityNavigation";
import { cn } from "@/lib/utils";

interface AvailabilityDateNavProps {
  focusDate: string;
  weekMonday: Date;
  onFocusDateChange: (dateStr: string) => void;
  onWeekMondayChange: (monday: Date) => void;
  /** Called when the loaded week changes (e.g. clear local edits). */
  onWeekBoundaryCross?: () => void;
  className?: string;
}

export function AvailabilityDateNav({
  focusDate,
  weekMonday,
  onFocusDateChange,
  onWeekMondayChange,
  onWeekBoundaryCross,
  className,
}: AvailabilityDateNavProps) {
  const weekDates = getWeekDates(weekMonday);

  function syncWeekForDate(dateStr: string) {
    const nextMonday = mondayOnOrBefore(dateStr);
    if (toYmdFromDate(weekMonday) !== toYmdFromDate(nextMonday)) {
      onWeekBoundaryCross?.();
    }
    onFocusDateChange(dateStr);
    onWeekMondayChange(nextMonday);
  }

  function shiftFocusDay(delta: number) {
    syncWeekForDate(addDaysIso(focusDate, delta));
  }

  function shiftWeekBlock(deltaWeeks: number) {
    onWeekBoundaryCross?.();
    const next = shiftWeekBlockDates(focusDate, weekMonday, deltaWeeks);
    onFocusDateChange(next.focusDate);
    onWeekMondayChange(next.weekMonday);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => shiftFocusDay(-1)}
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          className="h-8 w-[140px] text-xs"
          value={focusDate}
          onChange={(e) => {
            if (e.target.value) syncWeekForDate(e.target.value);
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => shiftFocusDay(1)}
          title="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => syncWeekForDate(todayYmd())}
        >
          Today
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Week loaded: {formatWeekRange(weekMonday)}
        <button
          type="button"
          className="ml-2 text-primary hover:underline"
          onClick={() => shiftWeekBlock(-1)}
        >
          ← prior week
        </button>
        <button
          type="button"
          className="ml-1.5 text-primary hover:underline"
          onClick={() => shiftWeekBlock(1)}
        >
          next week →
        </button>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {weekDates.map((dateStr) => {
          const active = dateStr === focusDate;
          const label = formatDayLabelShort(dateStr);
          const isToday = dateStr === todayYmd();
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => syncWeekForDate(dateStr)}
              className={cn(
                "h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
                isToday && !active && "ring-1 ring-primary/30"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
