import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParsedRow, ParseError } from "./csvParser";

interface ImportPreviewTableProps {
  rows: ParsedRow[];
  errors: ParseError[];
}

function rowHasError(rowIndex: number, errors: ParseError[]): boolean {
  return errors.some((e) => e.row === rowIndex);
}

export function ImportPreviewTable({ rows, errors }: ImportPreviewTableProps) {
  const errorSet = new Set(errors.map((e) => e.row));
  const validCount = rows.filter((r) => !errorSet.has(r._rowIndex)).length;
  const errorCount = rows.length - validCount;

  // Global parse errors (row 0 = header-level)
  const headerErrors = errors.filter((e) => e.row === 0);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">{validCount} valid</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{errorCount} with errors</span>
          </div>
        )}
        <span className="text-muted-foreground">— {rows.length} rows total</span>
      </div>

      {/* Header-level errors */}
      {headerErrors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1">
          {headerErrors.map((e, i) => (
            <p key={i} className="text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {e.message}
            </p>
          ))}
        </div>
      )}

      {/* Row errors list */}
      {errors.filter((e) => e.row > 0).length > 0 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-1 max-h-32 overflow-y-auto">
          <p className="text-xs font-medium text-amber-500 mb-1.5">Row validation issues (these rows will be skipped):</p>
          {errors
            .filter((e) => e.row > 0)
            .map((e, i) => (
              <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                Row {e.row}: {e.message}
              </p>
            ))}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Venue / Rink</TableHead>
                  <TableHead>Home Team</TableHead>
                  <TableHead>Away Team</TableHead>
                  <TableHead>League Tier</TableHead>
                  <TableHead>League Type</TableHead>
                  <TableHead className="w-16">#</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const hasErr = rowHasError(row._rowIndex, errors);
                  return (
                    <TableRow
                      key={row._rowIndex}
                      className={hasErr ? "bg-destructive/5 hover:bg-destructive/10 border-border" : "border-border hover:bg-secondary/30"}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {hasErr ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive mx-auto" />
                        ) : (
                          row._rowIndex
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{row.date || <span className="text-destructive/70 italic text-xs">missing</span>}</TableCell>
                      <TableCell className="text-sm font-mono">{row.time || <span className="text-destructive/70 italic text-xs">missing</span>}</TableCell>
                      <TableCell className="text-sm">{row.venue_name || <span className="text-destructive/70 italic text-xs">missing</span>}</TableCell>
                      <TableCell className="text-sm">{row.home_team || <span className="text-destructive/70 italic text-xs">missing</span>}</TableCell>
                      <TableCell className="text-sm">{row.away_team || <span className="text-destructive/70 italic text-xs">missing</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.league_tier || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.league_type ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {row.game_number ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
