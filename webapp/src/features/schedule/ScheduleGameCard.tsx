import { AlertTriangle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Position } from "@shared/types";
import type { ScheduleGame, ScheduleAssignment } from "./scheduleTypes";
import { usePositionSlots } from "@/hooks/usePositionSlots";
import { GAME_STATUS_STYLES, formatGameTime } from "./scheduleTypes";

interface ScheduleGameCardProps {
  game: ScheduleGame;
  onSlotClick: (position: Position, assignment: ScheduleAssignment | null) => void;
  onMessageClick?: () => void;
  onIncidentClick?: () => void;
}

function messageableAssignmentCount(game: ScheduleGame): number {
  return game.assignments.filter(
    (a) =>
      (a.status === "PENDING" || a.status === "CONFIRMED") && a.official_id
  ).length;
}

interface SlotButtonProps {
  position: { key: Position; label: string; abbr: string; group: "ref" | "line" };
  assignment: ScheduleAssignment | undefined;
  onClick: () => void;
}

function SlotButton({ position, assignment, onClick }: SlotButtonProps) {
  const filled = !!assignment;
  const isRef = position.group === "ref";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-all w-[112px] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        filled
          ? isRef
            ? "bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20"
            : "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
          : "border border-dashed border-border hover:border-primary/40 hover:bg-secondary/50"
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          filled ? (isRef ? "text-blue-500" : "text-emerald-600 dark:text-emerald-400") : "text-muted-foreground/60"
        )}
      >
        {position.abbr} · {position.label.split(" ")[0]}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium truncate w-full mt-0.5 leading-tight",
          filled ? "text-foreground" : "text-muted-foreground/50 italic"
        )}
      >
        {filled
          ? (assignment!.official?.full_name ?? "Unknown")
          : "unassigned"}
      </span>
    </button>
  );
}

export function ScheduleGameCard({
  game,
  onSlotClick,
  onMessageClick,
  onIncidentClick,
}: ScheduleGameCardProps) {
  const { slots: slotPositions } = usePositionSlots();
  const { timeStr, dayAbbr } = formatGameTime(game.date_time);
  const assignmentMap = new Map(game.assignments.map((a) => [a.position, a]));
  const statusStyle = GAME_STATUS_STYLES[game.status] ?? "text-muted-foreground";
  const messageableCount = messageableAssignmentCount(game);
  const hasScore =
    game.home_score != null &&
    game.away_score != null &&
    !Number.isNaN(game.home_score) &&
    !Number.isNaN(game.away_score);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-colors overflow-hidden",
        game.status === "CANCELLED" && "opacity-50"
      )}
    >
      <div className="flex items-stretch">
        {/* Time column */}
        <div className="w-[68px] flex-shrink-0 flex flex-col items-center justify-center border-r border-border px-2 py-3 text-center bg-secondary/30">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">{dayAbbr}</span>
          <span className="text-sm font-bold mt-0.5 tabular-nums leading-none">{timeStr.split(" ")[0]}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{timeStr.split(" ")[1] ?? ""}</span>
        </div>

        {/* Game info */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{game.home_team ?? "TBD"}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="text-sm font-semibold">{game.away_team ?? "TBD"}</span>
            {game.game_number ? (
              <span className="text-[10px] text-muted-foreground ml-1">#{game.game_number}</span>
            ) : null}
            {hasScore ? (
              <span className="text-sm font-bold tabular-nums text-foreground ml-1">
                {game.home_score}–{game.away_score}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {game.venue ? (
              <span className="text-xs text-muted-foreground">{game.venue.name}</span>
            ) : null}
            {game.league_tier ? (
              <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {game.league_tier}
              </span>
            ) : null}
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", statusStyle)}>
              {game.status}
            </span>
            {onMessageClick ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={onMessageClick}
                disabled={messageableCount === 0}
                title={
                  messageableCount === 0
                    ? "No assigned officials to message"
                    : `Message ${messageableCount} assigned official${messageableCount !== 1 ? "s" : ""}`
                }
              >
                <Mail className="h-3.5 w-3.5" />
                Message crew
              </Button>
            ) : null}
            {onIncidentClick ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-amber-600"
                onClick={onIncidentClick}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Incident
              </Button>
            ) : null}
          </div>
        </div>

        {/* Assignment slots */}
        <div className="flex-shrink-0 flex items-center p-3 border-l border-border">
          <div className="grid grid-cols-2 gap-1.5">
            {slotPositions.map((pos) => (
              <SlotButton
                key={pos.key}
                position={pos}
                assignment={assignmentMap.get(pos.key)}
                onClick={() => onSlotClick(pos.key, assignmentMap.get(pos.key) ?? null)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
