import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ImportDropZone } from "@/features/games/ImportDropZone";
import { ImportPreviewTable } from "@/features/games/ImportPreviewTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { BulkImportResult } from "@shared/types";
import type { CsvParseResult } from "@/features/games/csvParser";

type Stage = "idle" | "preview" | "success" | "error";

export default function ImportGames() {
  const [stage, setStage] = useState<Stage>("idle");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const hasFile = stage !== "idle" && stage !== "success" && parseResult !== null;

  const handleParsed = useCallback((result: CsvParseResult, name: string) => {
    setParseResult(result);
    setFileName(name);
    setImportResult(null);
    setStage("preview");
  }, []);

  const handleClear = useCallback(() => {
    setParseResult(null);
    setFileName("");
    setImportResult(null);
    setStage("idle");
  }, []);

  const validRows = parseResult?.rows.filter((r) => {
    const errSet = new Set((parseResult?.errors ?? []).map((e) => e.row));
    return !errSet.has(r._rowIndex);
  }) ?? [];

  const { mutate: runImport, isPending } = useMutation({
    mutationFn: () =>
      api.post<BulkImportResult>("/api/games/bulk", {
        rows: validRows.map(({ _rowIndex: _i, ...row }) => row),
      }),
    onSuccess: (result) => {
      setImportResult(result);
      setStage("success");
    },
    onError: (e: Error) => {
      setImportResult({ inserted: 0, skipped: validRows.length, errors: [{ row: 0, field: "—", message: e.message }] });
      setStage("error");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Import Games</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV export from your parent league system to bulk-import the schedule.
          </p>
        </div>

        <Separator />

        {/* Drop zone */}
        <ImportDropZone
          onParsed={handleParsed}
          onClear={handleClear}
          hasFile={hasFile}
          fileName={fileName}
        />

        {/* Preview */}
        {parseResult && stage === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClear} className="h-8">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={isPending || validRows.length === 0}
                  onClick={() => runImport()}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Import {validRows.length} Game{validRows.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <ImportPreviewTable rows={parseResult.rows} errors={parseResult.errors} />
          </div>
        )}

        {/* Result */}
        {(stage === "success" || stage === "error") && importResult && (
          <div className="rounded-lg border border-border bg-secondary/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              {stage === "success" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {stage === "success" ? "Import complete" : "Import encountered errors"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {importResult.inserted} game{importResult.inserted !== 1 ? "s" : ""} inserted
                  {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ""}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Row {e.row} [{e.field}]: {e.message}
                  </p>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleClear} className="h-8">
              Import another file
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
