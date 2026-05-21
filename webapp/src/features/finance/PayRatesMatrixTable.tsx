import { Plus, Trash2 } from "lucide-react";
import type { DivisionPayRatesRow, PayRatesMatrix } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssigningFeeCell } from "./AssigningFeeCell";
import { emptyDivisionRow, removeTierRow, setTierRow, tierEntries } from "./payRatesMatrixUtils";

const FEE_COLS = [
  { key: "REF1" as const, label: "Referee 1" },
  { key: "LINE1" as const, label: "Linesman 1" },
  { key: "LINE2" as const, label: "Linesman 2" },
  { key: "REF2" as const, label: "Referee 2" },
  { key: "SUPERVISOR" as const, label: "Supervisor" },
  { key: "TIMEKEEPER" as const, label: "Timekeeper" },
];

interface PayRatesMatrixTableProps {
  matrix: PayRatesMatrix;
  onChange: (next: PayRatesMatrix) => void;
}

export function PayRatesMatrixTable({ matrix, onChange }: PayRatesMatrixTableProps) {
  const rows = tierEntries(matrix);

  const updateRow = (name: string, row: DivisionPayRatesRow) => {
    onChange(setTierRow(matrix, name, row));
  };

  const renameRow = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const row = matrix.by_league_tier?.[oldName];
    if (!row) return;
    let next = removeTierRow(matrix, oldName);
    next = setTierRow(next, trimmed, row);
    onChange(next);
  };

  const addRow = () => {
    const base = emptyDivisionRow(matrix.default);
    onChange(setTierRow(matrix, "New Division", base));
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="min-w-[10rem] font-semibold">Division</TableHead>
              {FEE_COLS.map((c) => (
                <TableHead key={c.key} className="text-center min-w-[4.5rem] text-xs font-semibold">
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="text-center text-xs font-semibold min-w-[4rem]">
                Travel Pay
              </TableHead>
              <TableHead className="text-center text-xs font-semibold min-w-[7rem]">
                Assigning Fee
              </TableHead>
              <TableHead className="text-center text-xs font-semibold min-w-[4rem]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 cursor-help">
                        Cash Games
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Default for this division. Per-game override available when adding or editing a game.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  No divisions yet. Add a row, sync from schedule, or load the HNB Senior template.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ name, row }, idx) => (
                <TableRow
                  key={name}
                  className={idx % 2 === 1 ? "bg-muted/20" : undefined}
                >
                  <TableCell className="py-1.5">
                    <Input
                      className="h-8 text-sm min-w-[9rem]"
                      defaultValue={name}
                      key={name}
                      onBlur={(e) => renameRow(name, e.target.value)}
                    />
                  </TableCell>
                  {FEE_COLS.map((c) => (
                    <TableCell key={c.key} className="py-1.5 text-center">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-8 w-[4.25rem] mx-auto text-sm text-center px-1"
                        value={row[c.key]}
                        onChange={(e) =>
                          updateRow(name, {
                            ...row,
                            [c.key]: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="py-1.5 text-center">
                    <Checkbox
                      checked={row.travel_pay_enabled}
                      onCheckedChange={(v) =>
                        updateRow(name, {
                          ...row,
                          travel_pay_enabled: v === true,
                        })
                      }
                      aria-label={`Travel pay for ${name}`}
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <AssigningFeeCell
                      value={row.assigning_fee}
                      onChange={(assigning_fee) => updateRow(name, { ...row, assigning_fee })}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 text-center">
                    <Checkbox
                      checked={row.cash_games_default}
                      onCheckedChange={(v) =>
                        updateRow(name, {
                          ...row,
                          cash_games_default: v === true,
                        })
                      }
                      aria-label={`Cash games default for ${name}`}
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onChange(removeTierRow(matrix, name))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" />
        Add division
      </Button>
    </div>
  );
}

interface DefaultRatesStripProps {
  matrix: PayRatesMatrix;
  onChange: (next: PayRatesMatrix) => void;
}

const DEFAULT_POSITION_COLS = FEE_COLS.filter((c) => c.key !== "TIMEKEEPER");

export function DefaultRatesStrip({ matrix, onChange }: DefaultRatesStripProps) {
  const def = matrix.default;
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Defaults (unmatched division)
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        {DEFAULT_POSITION_COLS.map((c) => (
          <div key={c.key} className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{c.label}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              className="h-8 w-20 text-sm"
              value={def[c.key]}
              onChange={(e) =>
                onChange({
                  ...matrix,
                  default: { ...def, [c.key]: Number(e.target.value) || 0 },
                })
              }
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">$/km (mileage)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            className="h-8 w-20 text-sm"
            value={def.cost_per_km}
            onChange={(e) =>
              onChange({
                ...matrix,
                default: { ...def, cost_per_km: Number(e.target.value) || 0 },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
