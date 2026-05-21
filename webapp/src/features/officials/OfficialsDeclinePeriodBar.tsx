import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  currentNBSeasonStartYear,
  seasonLabel,
  type DeclinePeriodState,
} from "./officialsDeclineStats";

interface OfficialsDeclinePeriodBarProps {
  value: DeclinePeriodState;
  onChange: (next: DeclinePeriodState) => void;
  periodLabel?: string;
  totalDeclined?: number;
  className?: string;
}

const SEASON_YEARS = Array.from({ length: 6 }, (_, i) => currentNBSeasonStartYear() - i);

export function OfficialsDeclinePeriodBar({
  value,
  onChange,
  periodLabel,
  totalDeclined,
  className,
}: OfficialsDeclinePeriodBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Decline counts
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={value.mode === "season" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange({ ...value, mode: "season" })}
          >
            Season
          </Button>
          <Button
            type="button"
            variant={value.mode === "custom" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange({ ...value, mode: "custom" })}
          >
            Date range
          </Button>
        </div>
      </div>

      {value.mode === "season" ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Hockey season
          </label>
          <Select
            value={String(value.seasonYear)}
            onValueChange={(v) => onChange({ ...value, seasonYear: Number(v) })}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASON_YEARS.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {seasonLabel(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              From
            </label>
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={value.dateFrom}
              max={value.dateTo}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              To
            </label>
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={value.dateTo}
              min={value.dateFrom}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            />
          </div>
        </>
      )}

      {periodLabel ? (
        <p className="text-xs text-muted-foreground pb-1 ml-auto">
          Period: <span className="font-medium text-foreground">{periodLabel}</span>
          {totalDeclined != null ? (
            <>
              {" "}
              · <span className="tabular-nums">{totalDeclined}</span> total decline
              {totalDeclined !== 1 ? "s" : ""}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
