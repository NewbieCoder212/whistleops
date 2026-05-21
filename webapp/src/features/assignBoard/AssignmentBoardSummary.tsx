import type { AssignBoardSummary } from "@shared/types";
import { formatGameTime } from "@/features/schedule/scheduleTypes";

interface AssignmentBoardSummaryBarProps {
  summary: AssignBoardSummary;
}

export function AssignmentBoardSummaryBar({ summary }: AssignmentBoardSummaryBarProps) {
  const nextLabel = summary.next_unassigned_game_at
    ? formatGameTime(summary.next_unassigned_game_at).timeStr
    : null;

  const pending = summary.pending_assignments_count ?? 0;
  const confirmed = summary.confirmed_assignments_count ?? 0;
  const declined = summary.declined_assignments_count ?? 0;
  const awaitingGames = summary.games_awaiting_confirmation_count ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <Metric label="Games" value={summary.games_count} />
        <Metric label="Open slots" value={summary.open_slots_count} highlight={summary.open_slots_count > 0} />
        <Metric label="Officials in zone" value={summary.officials_count} />
        <Metric
          label="Availability submitted"
          value={`${summary.officials_with_submission_count} / ${summary.officials_count}`}
        />
        {nextLabel ? (
          <div className="flex flex-col gap-0.5 border-l border-border pl-3">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Next needs assignment
            </span>
            <span className="font-semibold tabular-nums">{nextLabel}</span>
          </div>
        ) : null}
      </div>
      {(pending > 0 || confirmed > 0 || declined > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Crew responses
          </span>
          <span className="text-amber-700 dark:text-amber-300 font-medium tabular-nums">
            {pending} pending
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-medium tabular-nums">
            {confirmed} confirmed
          </span>
          {declined > 0 ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-red-700 dark:text-red-300 font-medium tabular-nums">
                {declined} declined
              </span>
            </>
          ) : null}
          {awaitingGames > 0 ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground tabular-nums">
                {awaitingGames} game{awaitingGames !== 1 ? "s" : ""} awaiting confirmation
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={
          highlight ? "font-semibold text-amber-600 dark:text-amber-400" : "font-semibold tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
