import { Link } from "react-router-dom";
import { AlertTriangle, LayoutGrid, Mail, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Position } from "@shared/types";
import type { ScheduleGame, ScheduleAssignment } from "./scheduleTypes";
import { usePositionSlots } from "@/hooks/usePositionSlots";
import { GAME_STATUS_STYLES, formatGameTime, toDateKey } from "./scheduleTypes";
import {
  AssignmentStatusBadge,
  filledSlotSurfaceClass,
} from "@/features/assignments/assignmentStatusDisplay";

interface ScheduleGameCardProps {
  game: ScheduleGame;
  zonesById?: Map<string, string>;
  /** Slots link here; assigning happens on Assignment Board (read-only on Schedule). */
  assignBoardHref?: string;
  onMessageClick?: () => void;
  onIncidentClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}

function messageableAssignmentCount(game: ScheduleGame): number {
  return game.assignments.filter(
    (a) =>
      (a.status === "PENDING" || a.status === "CONFIRMED") && a.official_id
  ).length;
}

interface SlotDisplayProps {
  position: { key: Position; label: string; abbr: string; group: "ref" | "line" };
  assignment: ScheduleAssignment | undefined;
  boardHref: string;
}

function SlotDisplay({ position, assignment, boardHref }: SlotDisplayProps) {
  const filled = !!assignment;
  const isRef = position.group === "ref";

  return (
    <Link
      to={boardHref}
      title="Open on Assignment Board to assign or change this slot"
      className={cn(
        "flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-all w-[112px] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "hover:ring-1 hover:ring-primary/30",
        filled
          ? filledSlotSurfaceClass(assignment!.status)
          : "border border-dashed border-border hover:border-primary/40 hover:bg-secondary/50"
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider w-full flex items-center justify-between gap-1",
          filled
            ? isRef
              ? "text-blue-600 dark:text-blue-400"
              : "text-emerald-700 dark:text-emerald-400"
            : "text-muted-foreground/60"
        )}
      >
        <span>
          {position.abbr} · {position.label.split(" ")[0]}
        </span>
        {filled ? <AssignmentStatusBadge status={assignment!.status} compact /> : null}
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
    </Link>
  );
}

export function ScheduleGameCard({
  game,
  zonesById,
  assignBoardHref,
  onMessageClick,
  onIncidentClick,
  onEditClick,
  onDeleteClick,
}: ScheduleGameCardProps) {
  const { slots: slotPositions } = usePositionSlots();
  const { timeStr, dayAbbr } = formatGameTime(game.date_time);
  const assignmentMap = new Map(game.assignments.map((a) => [a.position, a]));
  const statusStyle = GAME_STATUS_STYLES[game.status] ?? "text-muted-foreground";
  const messageableCount = messageableAssignmentCount(game);
  const draftCount = game.assignments.filter((a) => a.status === "DRAFT").length;
  const pendingCount = game.assignments.filter((a) => a.status === "PENDING").length;
  const declinedCount = game.assignments.filter((a) => a.status === "REJECTED").length;
  const venueZoneId = game.venue?.zone_id ?? null;
  const venueZoneName =
    venueZoneId && zonesById ? zonesById.get(venueZoneId) ?? null : null;
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
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">No rink</span>
            )}
            {game.venue && !venueZoneId ? (
              <span className="inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                Rink has no zone
              </span>
            ) : venueZoneName ? (
              <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {venueZoneName}
              </span>
            ) : null}
            {game.league_tier ? (
              <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {game.league_tier}
              </span>
            ) : null}
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", statusStyle)}>
              {game.status}
            </span>
            {draftCount > 0 ? (
              <span className="inline-flex items-center rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                {draftCount} draft
              </span>
            ) : null}
            {pendingCount > 0 ? (
              <span className="inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                {pendingCount} awaiting confirmation
              </span>
            ) : null}
            {declinedCount > 0 ? (
              <span className="inline-flex items-center rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                {declinedCount} declined
              </span>
            ) : null}
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
            {onEditClick || onDeleteClick ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label="Game actions"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditClick ? (
                    <DropdownMenuItem onClick={onEditClick}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit game
                    </DropdownMenuItem>
                  ) : null}
                  {onDeleteClick ? (
                    <DropdownMenuItem
                      onClick={onDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete game
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {/* Assignment slots (read-only — assign on board) */}
        <div className="flex-shrink-0 flex flex-col justify-center gap-1.5 p-3 border-l border-border">
          {assignBoardHref ? (
            <Link
              to={assignBoardHref}
              className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline self-end"
              title="Open this day on Assignment Board"
            >
              <LayoutGrid className="h-3 w-3" />
              Assign on board
            </Link>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5">
            {slotPositions.map((pos) => (
              <SlotDisplay
                key={pos.key}
                position={pos}
                assignment={assignmentMap.get(pos.key)}
                boardHref={
                  assignBoardHref ?? `/admin/assignment-board?date=${toDateKey(game.date_time)}`
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
