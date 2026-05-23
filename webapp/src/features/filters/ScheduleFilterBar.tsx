import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Zone, Venue } from "@shared/types";
import { RinkFilter } from "./RinkFilter";
import { venuesApi } from "@/lib/resources";
import { useTranslation } from "@/i18n/I18nProvider";
import { leagueTypeLabel, zoneSelectLabel } from "@/i18n/labels";
import {
  type ScheduleFilterState,
  todayIso,
  addDaysIso,
  startOfWeekIso,
  endOfWeekIso,
} from "./scheduleFilterUtils";

export type { ScheduleFilterState } from "./scheduleFilterUtils";
export { defaultScheduleFilters, buildGamesQueryParams } from "./scheduleFilterUtils";

export const LEAGUE_TYPES = ["Minor", "Senior", "Adult Rec"] as const;

interface ScheduleFilterBarProps {
  value: ScheduleFilterState;
  onChange: (f: ScheduleFilterState) => void;
  scheduleGames?: { venue_id: string | null; venue?: { id?: string } | null }[];
  onOpenAssignmentBoard?: (date: string) => void;
  homeZoneId?: string | null;
  className?: string;
}

export function ScheduleFilterBar({
  value,
  onChange,
  scheduleGames = [],
  onOpenAssignmentBoard,
  homeZoneId,
  className,
}: ScheduleFilterBarProps) {
  const { t } = useTranslation();

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["venues", "assignable"],
    queryFn: () => venuesApi.list({ assignable: true }),
    staleTime: 10 * 60 * 1000,
  });

  const hasFilter =
    value.zoneId !== null ||
    value.leagueType !== null ||
    value.unassignedOnly ||
    value.declinedOnly ||
    (value.venueIds !== null && value.venueIds.length > 0);

  function patch(partial: Partial<ScheduleFilterState>) {
    onChange({ ...value, ...partial });
  }

  function clearAll() {
    const from = todayIso();
    onChange({
      zoneId: null,
      leagueType: null,
      dateFrom: from,
      dateTo: addDaysIso(from, 7),
      unassignedOnly: false,
      declinedOnly: false,
      venueIds: null,
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 pb-2">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-medium">{t("filters.label")}</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("filters.from")}
          </label>
          <Input
            type="date"
            className="h-8 w-[140px] text-xs"
            value={value.dateFrom}
            max={value.dateTo}
            onChange={(e) => patch({ dateFrom: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("filters.to")}
          </label>
          <Input
            type="date"
            className="h-8 w-[140px] text-xs"
            value={value.dateTo}
            min={value.dateFrom}
            onChange={(e) => patch({ dateTo: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("filters.zone")}
          </label>
          <Select
            value={value.zoneId ?? "all"}
            onValueChange={(v) =>
              patch({ zoneId: v === "all" ? null : v, venueIds: null })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-[160px] max-w-[240px] text-xs border-border">
              <SelectValue placeholder={t("filters.allZones")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allZones")}</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {zoneSelectLabel(z.name, z.id, homeZoneId, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {LEAGUE_TYPES.map((lt) => {
            const active = value.leagueType === lt;
            return (
              <button
                key={lt}
                type="button"
                onClick={() => patch({ leagueType: active ? null : lt })}
                className={cn(
                  "h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {leagueTypeLabel(lt, t)}
              </button>
            );
          })}
        </div>
      </div>

      {value.zoneId ? (
        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[4.5rem]">
          <RinkFilter
            zoneId={value.zoneId}
            venues={venues}
            venueIds={value.venueIds}
            onChange={(venueIds) => patch({ venueIds })}
            games={scheduleGames}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        {onOpenAssignmentBoard ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onOpenAssignmentBoard(todayIso())}
          >
            {t("schedule.assignToday")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const today = todayIso();
            patch({ dateFrom: startOfWeekIso(today), dateTo: endOfWeekIso(today) });
          }}
        >
          {t("schedule.thisWeek")}
        </Button>
        <Button
          type="button"
          variant={value.unassignedOnly ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => patch({ unassignedOnly: !value.unassignedOnly })}
        >
          {t("schedule.unassignedOnly")}
        </Button>
        <Button
          type="button"
          variant={value.declinedOnly ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => patch({ declinedOnly: !value.declinedOnly })}
        >
          {t("schedule.declinedOnly")}
        </Button>
        {hasFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground gap-1"
            onClick={clearAll}
          >
            <X className="h-3 w-3" />
            {t("filters.clearFilters")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
