import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import type { AssignBoardGame, Venue } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  countGamesByVenue,
  countOpenSlotsByVenue,
  NO_RINK_VENUE_ID,
  rinkFilterSummary,
  venuesInZone,
  type GameWithVenue,
} from "./rinkFilterUtils";

interface RinkFilterProps {
  zoneId: string | null;
  venues: Venue[];
  venueIds: string[] | null;
  onChange: (venueIds: string[] | null) => void;
  games?: GameWithVenue[];
  boardGames?: AssignBoardGame[];
  showOpenSlots?: boolean;
  className?: string;
}

export function RinkFilter({
  zoneId,
  venues,
  venueIds,
  onChange,
  games = [],
  boardGames,
  showOpenSlots = false,
  className,
}: RinkFilterProps) {
  const [onlyWithGames, setOnlyWithGames] = useState(false);

  const rinksInZone = useMemo(
    () => (zoneId ? venuesInZone(venues, zoneId) : []),
    [venues, zoneId]
  );

  const gameCounts = useMemo(() => countGamesByVenue(games), [games]);
  const openSlotCounts = useMemo(
    () => (boardGames ? countOpenSlotsByVenue(boardGames) : new Map<string, number>()),
    [boardGames]
  );

  const visibleRinks = useMemo(() => {
    if (!onlyWithGames) return rinksInZone;
    return rinksInZone.filter((v) => (gameCounts.get(v.id) ?? 0) > 0);
  }, [rinksInZone, onlyWithGames, gameCounts]);

  const hasNoRinkGames = (gameCounts.get(NO_RINK_VENUE_ID) ?? 0) > 0;

  const selectedSet = useMemo(() => new Set(venueIds ?? []), [venueIds]);

  const allSelected = venueIds === null;

  function toggleVenue(id: string, checked: boolean) {
    const allIds = rinksInZone.map((v) => v.id);
    if (hasNoRinkGames) allIds.push(NO_RINK_VENUE_ID);

    if (checked) {
      if (allSelected) return;
      const next = new Set(selectedSet);
      next.add(id);
      const nextArr = Array.from(next);
      if (nextArr.length >= allIds.length) {
        onChange(null);
      } else {
        onChange(nextArr);
      }
      return;
    }

    if (allSelected) {
      onChange(allIds.filter((vid) => vid !== id));
      return;
    }

    const next = Array.from(selectedSet).filter((vid) => vid !== id);
    onChange(next.length === 0 ? [] : next);
  }

  function selectAll() {
    onChange(null);
  }

  function clearSelection() {
    onChange([]);
  }

  if (!zoneId) return null;

  const triggerLabel = rinkFilterSummary(venueIds, rinksInZone.length);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 text-xs font-normal", className)}
        >
          <Building2 className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Rinks in zone</p>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={selectAll}>
              All
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rink-only-with-games"
              checked={onlyWithGames}
              onCheckedChange={(v) => setOnlyWithGames(v === true)}
            />
            <Label htmlFor="rink-only-with-games" className="text-xs font-normal cursor-pointer">
              Only rinks with games
            </Label>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
          {visibleRinks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">No assignable rinks in this zone.</p>
          ) : (
            visibleRinks.map((rink) => {
              const count = gameCounts.get(rink.id) ?? 0;
              const open = openSlotCounts.get(rink.id) ?? 0;
              const checked = allSelected || selectedSet.has(rink.id);
              return (
                <div
                  key={rink.id}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    id={`rink-${rink.id}`}
                    checked={checked}
                    onCheckedChange={(v) => toggleVenue(rink.id, v === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`rink-${rink.id}`}
                    className="flex-1 text-xs font-normal cursor-pointer leading-snug"
                  >
                    <span className="font-medium text-foreground">{rink.name}</span>
                    <span className="text-muted-foreground ml-1">
                      ({count} game{count !== 1 ? "s" : ""}
                      {showOpenSlots && open > 0 ? ` · ${open} open` : ""})
                    </span>
                  </Label>
                </div>
              );
            })
          )}
          {hasNoRinkGames && !onlyWithGames ? (
            <div className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 border-t border-border mt-1 pt-2">
              <Checkbox
                id="rink-no-venue"
                checked={allSelected || selectedSet.has(NO_RINK_VENUE_ID)}
                onCheckedChange={(v) => toggleVenue(NO_RINK_VENUE_ID, v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="rink-no-venue" className="flex-1 text-xs font-normal cursor-pointer">
                <span className="font-medium text-foreground">No rink assigned</span>
                <span className="text-muted-foreground ml-1">
                  ({gameCounts.get(NO_RINK_VENUE_ID) ?? 0} game
                  {(gameCounts.get(NO_RINK_VENUE_ID) ?? 0) !== 1 ? "s" : ""})
                </span>
              </Label>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
