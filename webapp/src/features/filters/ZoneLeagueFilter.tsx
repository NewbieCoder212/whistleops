import { useQuery } from "@tanstack/react-query";
import { Filter, X } from "lucide-react";
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
import type { Zone } from "@shared/types";

export type FilterState = {
  zoneId: string | null;
  leagueType: string | null;
};

export const LEAGUE_TYPES = ["Minor", "Senior", "Adult Rec"] as const;

interface ZoneLeagueFilterProps {
  value: FilterState;
  onChange: (f: FilterState) => void;
  className?: string;
  /** Official's home zone — hides zone picker and keeps filter fixed. */
  lockedZoneId?: string | null;
}

export function ZoneLeagueFilter({
  value,
  onChange,
  className,
  lockedZoneId,
}: ZoneLeagueFilterProps) {
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  const lockedZoneName =
    lockedZoneId != null
      ? zones.find((z) => z.id === lockedZoneId)?.name ?? "Your zone"
      : null;

  const effectiveZoneId = lockedZoneId ?? value.zoneId;
  const hasFilter =
    (lockedZoneId == null && value.zoneId !== null) || value.leagueType !== null;

  function setZone(zoneId: string | null) {
    if (lockedZoneId) return;
    onChange({ ...value, zoneId });
  }

  function setLeague(leagueType: string | null) {
    onChange({
      ...value,
      zoneId: lockedZoneId ?? value.zoneId,
      leagueType: value.leagueType === leagueType ? null : leagueType,
    });
  }

  function clearAll() {
    onChange({ zoneId: lockedZoneId ?? null, leagueType: null });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-medium">Filter</span>
      </div>

      {/* Zone: locked for officials with a home zone, otherwise selectable */}
      {lockedZoneId ? (
        <span className="h-8 inline-flex items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground">
          {lockedZoneName}
        </span>
      ) : (
        <Select
          value={effectiveZoneId ?? "all"}
          onValueChange={(v) => setZone(v === "all" ? null : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[140px] max-w-[220px] text-xs border-border">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* League type pills */}
      <div className="flex items-center gap-1.5">
        {LEAGUE_TYPES.map((lt) => {
          const active = value.leagueType === lt;
          return (
            <button
              key={lt}
              onClick={() => setLeague(lt)}
              className={cn(
                "h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {lt}
            </button>
          );
        })}
      </div>

      {/* Clear */}
      {hasFilter ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={clearAll}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
