import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AssignBoardGame, AssignBoardOfficial, Position } from "@shared/types";
import { certificationLevelsApi, leagueQualificationsApi, profilesApi } from "@/lib/resources";
import type { ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import { formatGameTime } from "@/features/schedule/scheduleTypes";
import {
  AVAILABILITY_LABELS,
  buildHourFocusOfficialRows,
  formatHourLabel,
  openSlotCount,
  type HourFocusOfficialRow,
} from "./assignBoardUtils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvailabilityStatus } from "@shared/types";

const TYPE_LABELS: Record<string, string> = {
  REFEREE: "Ref",
  LINESMAN: "Line",
};

const SECTION_ORDER: AvailabilityStatus[] = [
  "available",
  "no_submission",
  "unavailable",
  "busy",
];

const BADGE_CLASS: Record<AvailabilityStatus, string> = {
  available: "text-emerald-600 dark:text-emerald-400",
  no_submission: "text-amber-600 dark:text-amber-400",
  unavailable: "text-muted-foreground",
  busy: "text-amber-700 dark:text-amber-500",
};

interface AssignmentBoardHourFocusProps {
  game: AssignBoardGame | null;
  officials: AssignBoardOfficial[];
  activePosition: Position | null;
  onPickOfficial: (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null,
    officialId: string
  ) => void;
  onSlotClick: (game: ScheduleGame, position: Position, assignment: ScheduleAssignment | null) => void;
}

function toScheduleGame(game: AssignBoardGame): ScheduleGame {
  return {
    id: game.id,
    date_time: game.date_time,
    venue_id: game.venue_id,
    status: game.status,
    home_team: game.home_team,
    away_team: game.away_team,
    league_tier: game.league_tier,
    league_type: game.league_type,
    notes: game.notes,
    game_number: game.game_number,
    created_at: game.created_at,
    updated_at: game.updated_at,
    venue: game.venue
      ? {
          id: game.venue.id,
          name: game.venue.name,
          timezone: game.venue.timezone ?? "America/Moncton",
          zone_id: game.venue.zone_id,
        }
      : null,
    assignments: [],
  };
}

function OfficialRow({
  row,
  game,
  position,
  onAssign,
}: {
  row: HourFocusOfficialRow;
  game: AssignBoardGame;
  position: Position | null;
  onAssign: (officialId: string) => void;
}) {
  const { official, availabilityStatus, levelName, canAssign } = row;
  const assignmentToday = official.assignments_today.filter((a) => a.game_hour === game.game_hour);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {official.full_name ?? official.email}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {levelName ?? "No cert"}
          {official.official_type ? ` · ${TYPE_LABELS[official.official_type] ?? official.official_type}` : ""}
          {assignmentToday.length > 0
            ? ` · ${assignmentToday.length} game${assignmentToday.length !== 1 ? "s" : ""} this hour`
            : ""}
        </p>
      </div>
      <span className={cn("text-[10px] font-medium shrink-0", BADGE_CLASS[availabilityStatus])}>
        {AVAILABILITY_LABELS[availabilityStatus]}
      </span>
      {canAssign && position ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs shrink-0"
          onClick={() => onAssign(official.official_id)}
        >
          Assign
        </Button>
      ) : null}
    </div>
  );
}

export function AssignmentBoardHourFocus({
  game,
  officials,
  activePosition,
  onPickOfficial,
  onSlotClick,
}: AssignmentBoardHourFocusProps) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: profilesApi.list,
  });
  const { data: levels = [] } = useQuery({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });
  const { data: qualifications = [] } = useQuery({
    queryKey: ["league-qualifications"],
    queryFn: leagueQualificationsApi.list,
  });

  const buckets = useMemo(() => {
    if (!game) return null;
    return buildHourFocusOfficialRows(game, officials, profiles, qualifications, levels);
  }, [game, officials, profiles, qualifications, levels]);

  if (!game) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Select a game row to see who is available at that time.
      </div>
    );
  }

  const scheduleGame = toScheduleGame(game);
  const { timeStr } = formatGameTime(game.date_time);
  const open = openSlotCount(game);
  const firstOpenSlot = game.slots.find((s) => !s.assignment);
  const defaultPosition = activePosition ?? firstOpenSlot?.position ?? null;

  const handleAssign = (officialId: string) => {
    if (!defaultPosition) {
      onSlotClick(scheduleGame, "REF1", null);
      return;
    }
    onPickOfficial(scheduleGame, defaultPosition, null, officialId);
  };

  const totalListed =
    buckets &&
    SECTION_ORDER.reduce((n, k) => n + (buckets[k]?.length ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-sm font-semibold">
          {timeStr} · {game.home_team ?? "TBD"} vs {game.away_team ?? "TBD"}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatHourLabel(game.game_hour)} · {open} open slot{open !== 1 ? "s" : ""}
          {defaultPosition ? ` · assigning ${defaultPosition}` : " · click a slot to pick position"}
          {totalListed != null ? ` · ${totalListed} qualified officials` : ""}
        </p>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-2 space-y-3">
        {buckets &&
          SECTION_ORDER.map((status) => {
            const rows = buckets[status];
            if (!rows.length) return null;
            return (
              <div key={status}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                  {AVAILABILITY_LABELS[status]} ({rows.length})
                </p>
                <div className="space-y-0.5">
                  {rows.map((row) => (
                    <OfficialRow
                      key={row.official.official_id}
                      row={row}
                      game={game}
                      position={defaultPosition}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        {totalListed === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No qualified officials in this zone for this game.
          </p>
        ) : null}
      </div>
    </div>
  );
}
