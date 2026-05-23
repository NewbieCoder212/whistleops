import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { venuesApi } from "@/lib/resources";
import type { BulkVenueImportResult } from "@shared/types";
import { parseVenuesCsv, type VenuesCsvParseResult } from "./venuesCsvParser";

export function ImportVenuesSection() {
  const qc = useQueryClient();
  const [parseResult, setParseResult] = useState<VenuesCsvParseResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importResult, setImportResult] = useState<BulkVenueImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setParseResult(parseVenuesCsv(reader.result));
        setImportResult(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const errorRows = new Set(parseResult?.errors.map((e) => e.row) ?? []);
  const validRows =
    parseResult?.rows.filter((r) => !errorRows.has(r._rowIndex)) ?? [];

  const { mutate: runImport, isPending } = useMutation({
    mutationFn: () =>
      venuesApi.bulk({
        rows: validRows.map(({ _rowIndex, ...row }) => row),
        update_existing: updateExisting,
      }),
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
  });

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Import Rinks (CSV)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Expected columns: <strong>Venue Name</strong>, <strong>Zone</strong> (1–9), Address,
          City, Province/State, Postal/ZIP Code. Compatible with GrayJay venue exports.
        </p>
      </div>

      <div
        className={`border border-dashed rounded-lg p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
          }}
        />
        <p className="text-sm text-muted-foreground">
          {dragging ? "Drop CSV here" : "Drag & drop a .csv file or click to browse"}
        </p>
      </div>

      {parseResult && parseResult.rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-existing-venues"
                checked={updateExisting}
                onCheckedChange={(v) => setUpdateExisting(!!v)}
              />
              <Label htmlFor="update-existing-venues" className="text-sm">
                Update existing rinks (zone &amp; address)
              </Label>
            </div>
            <Button
              size="sm"
              disabled={validRows.length === 0 || isPending}
              onClick={() => runImport()}
              className="gap-1.5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Import {validRows.length} rink{validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto max-h-[280px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parseResult.rows.map((row) => (
                  <TableRow key={row._rowIndex}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.zone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {[row.address, row.city, row.province, row.postal]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      {importResult ? (
        <div className="rounded-md border border-border px-4 py-3 text-sm space-y-1">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {importResult.inserted} imported
            {importResult.updated > 0 ? `, ${importResult.updated} updated` : ""}
            {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ""}
          </p>
          {importResult.errors.map((e, i) => (
            <p key={i} className="text-destructive text-xs">
              Row {e.row}: {e.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
