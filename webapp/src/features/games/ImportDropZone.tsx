import { useRef, useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseCsv, type CsvParseResult } from "./csvParser";

interface ImportDropZoneProps {
  onParsed: (result: CsvParseResult, fileName: string) => void;
  onClear: () => void;
  hasFile: boolean;
  fileName?: string;
}

export function ImportDropZone({ onParsed, onClear, hasFile, fileName }: ImportDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a .csv file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          onParsed(parseCsv(text), file.name);
        }
      };
      reader.readAsText(file);
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  if (hasFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
        <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">{fileName}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-secondary/20 hover:border-border/80 hover:bg-secondary/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors", dragging ? "bg-primary/10" : "bg-secondary")}>
        <Upload className={cn("h-5 w-5 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-sm font-medium">
          {dragging ? "Drop your CSV here" : "Drag & drop a CSV file"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          or click to browse — .csv files only
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground max-w-sm leading-relaxed">
        Expected columns: <span className="font-mono">Date, Time, Venue, Home Team, Away Team</span>
        {" "}(League Tier optional). Flexible header names accepted.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={onFileChange}
      />
    </div>
  );
}
