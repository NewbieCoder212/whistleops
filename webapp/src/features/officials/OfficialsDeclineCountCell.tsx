import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { DeclinedAssignmentGame } from "@shared/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatGameTime, toDateKey } from "@/features/schedule/scheduleTypes";
import { cn } from "@/lib/utils";

const POSITION_ABBR: Record<string, string> = {
  REF1: "R1",
  REF2: "R2",
  LINE1: "L1",
  LINE2: "L2",
  SUPERVISOR: "SUP",
};

function DeclinedGameRow({ game }: { game: DeclinedAssignmentGame }) {
  const { timeStr, dayAbbr } = formatGameTime(game.date_time);
  const dateKey = toDateKey(game.date_time);
  const matchup = `${game.home_team ?? "TBD"} vs ${game.away_team ?? "TBD"}`;
  const pos = POSITION_ABBR[game.position] ?? game.position;

  return (
    <li className="border-b border-border/60 last:border-0 py-2 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-tight truncate">{matchup}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {dayAbbr} {timeStr}
            {game.venue_name ? ` · ${game.venue_name}` : ""}
            {game.league_tier ? ` · ${game.league_tier}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Position: {pos}</p>
        </div>
        <Link
          to={`/admin/assignment-board?date=${dateKey}`}
          className="text-[10px] font-medium text-primary hover:underline shrink-0 whitespace-nowrap"
        >
          Board
        </Link>
      </div>
    </li>
  );
}

interface OfficialsDeclineCountCellProps {
  count: number;
  games: DeclinedAssignmentGame[];
  loading?: boolean;
  officialName?: string | null;
}

export function OfficialsDeclineCountCell({
  count,
  games,
  loading,
  officialName,
}: OfficialsDeclineCountCellProps) {
  if (loading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />;
  }

  if (count <= 0) {
    return <span className="text-muted-foreground text-sm tabular-nums">0</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 min-w-[2rem] px-2 font-semibold tabular-nums text-red-700 dark:text-red-400",
            "hover:bg-red-500/10 hover:text-red-800 dark:hover:text-red-300"
          )}
          title="View declined games"
        >
          {count}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <p className="text-xs font-semibold mb-2">
          Declined games
          {officialName ? (
            <span className="font-normal text-muted-foreground"> · {officialName}</span>
          ) : null}
        </p>
        <ul className="max-h-[240px] overflow-y-auto">
          {games.map((g) => (
            <DeclinedGameRow key={g.assignment_id} game={g} />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
