import { useState } from "react";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OfficialPaySummary } from "@shared/types";

const POSITION_LABELS: Record<string, string> = {
  REF1: "Referee 1",
  REF2: "Referee 2",
  LINE1: "Linesman 1",
  LINE2: "Linesman 2",
  SUPERVISOR: "Supervisor",
};

const TYPE_LABELS: Record<string, string> = {
  REFEREE: "Referee",
  LINESMAN: "Linesman",
};

const RATE_SOURCE_LABELS: Record<string, string> = {
  tier: "Tier",
  type: "League",
  default: "Default",
};

const POSITION_COLORS: Record<string, string> = {
  REF1: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  REF2: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  LINE1: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  LINE2: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  SUPERVISOR: "text-violet-500 bg-violet-500/10 border-violet-500/20",
};

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function fmtDate(isoStr: string): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

interface OfficialPayRowProps {
  summary: OfficialPaySummary;
  onApprove: () => void;
  isPending: boolean;
}

export function OfficialPayRow({ summary, onApprove, isPending }: OfficialPayRowProps) {
  const [expanded, setExpanded] = useState(false);

  const unapprovedCount = summary.assignments.filter((a) => !a.payout_approved).length;

  return (
    <>
      {/* Main summary row */}
      <TableRow
        className={cn(
          "group border-border transition-colors",
          expanded ? "bg-secondary/30" : "hover:bg-secondary/20"
        )}
      >
        {/* Expand + name */}
        <TableCell>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
              />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {summary.official_name ?? summary.official_email}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {summary.official_type
                  ? TYPE_LABELS[summary.official_type] ?? summary.official_type
                  : summary.official_email}
              </p>
            </div>
          </div>
        </TableCell>

        <TableCell className="tabular-nums text-center text-sm">
          {summary.assignment_count}
        </TableCell>

        <TableCell className="tabular-nums text-sm font-medium">
          {fmt(summary.game_fees)}
        </TableCell>

        <TableCell className="text-sm">
          {summary.mileage_km > 0 ? (
            <span>
              <span className="tabular-nums">{summary.mileage_km.toFixed(0)} km</span>
              <span className="text-muted-foreground"> · </span>
              <span className="tabular-nums">{fmt(summary.mileage_payout)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>

        <TableCell className="tabular-nums text-sm font-semibold">
          {fmt(summary.total_due)}
        </TableCell>

        {/* Status */}
        <TableCell>
          {summary.all_approved ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {unapprovedCount} pending
            </span>
          )}
        </TableCell>

        {/* Action */}
        <TableCell>
          {summary.all_approved ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Locked
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              disabled={isPending}
              onClick={onApprove}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Approve for Payout
            </Button>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded assignment lines */}
      {expanded && (
        <TableRow className="hover:bg-transparent border-border">
          <TableCell colSpan={7} className="p-0">
            <div className="border-b border-border bg-secondary/10 px-8 pb-3 pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-1.5 font-medium pr-4">Date</th>
                    <th className="text-left py-1.5 font-medium pr-4">Game</th>
                    <th className="text-left py-1.5 font-medium pr-4">Venue</th>
                    <th className="text-left py-1.5 font-medium pr-4">Position</th>
                    <th className="text-left py-1.5 font-medium pr-4">Rate</th>
                    <th className="text-right py-1.5 font-medium pr-4">Game Fee</th>
                    <th className="text-right py-1.5 font-medium pr-4">Mileage</th>
                    <th className="text-center py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.assignments.map((line) => (
                    <tr
                      key={line.assignment_id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-1.5 pr-4 text-muted-foreground">
                        {fmtDate(line.game_date)}
                      </td>
                      <td className="py-1.5 pr-4 font-medium">
                        {line.home_team ?? "TBD"} vs {line.away_team ?? "TBD"}
                      </td>
                      <td className="py-1.5 pr-4 text-muted-foreground">
                        {line.venue_name ?? "—"}
                      </td>
                      <td className="py-1.5 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded border px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[10px]",
                            POSITION_COLORS[line.position] ?? "text-muted-foreground bg-secondary border-border"
                          )}
                        >
                          {POSITION_LABELS[line.position] ?? line.position}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4 text-muted-foreground">
                        {line.rate_source ? (
                          <span className="text-[10px]">
                            {RATE_SOURCE_LABELS[line.rate_source] ?? line.rate_source}
                            {line.rate_label ? `: ${line.rate_label}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {fmt(line.game_fee)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {line.mileage_km > 0 ? `${fmt(line.mileage_payout)}` : "—"}
                      </td>
                      <td className="py-1.5 text-center">
                        {line.payout_approved ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
