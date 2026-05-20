import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Tag } from "lucide-react";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import type { Position, PositionLabelsConfig } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const POSITIONS: Position[] = ["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"];

const DEFAULT: PositionLabelsConfig = {
  REF1: { label: "Referee 1", abbr: "R1", show_on_assignment: true },
  REF2: { label: "Referee 2", abbr: "R2", show_on_assignment: true },
  LINE1: { label: "Linesman 1", abbr: "L1", show_on_assignment: true },
  LINE2: { label: "Linesman 2", abbr: "L2", show_on_assignment: true },
  SUPERVISOR: { label: "Supervisor", abbr: "SV", show_on_assignment: true },
};

export function PositionLabelsPanel() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<PositionLabelsConfig>(DEFAULT);

  const { data: setting, isLoading } = useQuery({
    queryKey: ["settings", "position_labels"],
    queryFn: async () => {
      try {
        return await settingsApi.get("position_labels");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  useEffect(() => {
    if (setting?.value) setConfig({ ...DEFAULT, ...(setting.value as PositionLabelsConfig) });
  }, [setting?.value]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.upsert("position_labels", config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "position_labels"] });
      toast.success("Position titles saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Referee titles
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Rename assignment slots and control which appear on the schedule board.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <div className="space-y-3">
        {POSITIONS.map((pos) => (
          <div key={pos} className="grid grid-cols-[80px_1fr_60px_auto] gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground">{pos}</span>
            <Input
              className="h-8 text-sm"
              value={config[pos].label}
              onChange={(e) =>
                setConfig((c) => ({ ...c, [pos]: { ...c[pos], label: e.target.value } }))
              }
            />
            <Input
              className="h-8 text-sm"
              value={config[pos].abbr}
              onChange={(e) =>
                setConfig((c) => ({ ...c, [pos]: { ...c[pos], abbr: e.target.value } }))
              }
            />
            <div className="flex items-center gap-1.5">
              <Checkbox
                id={`show-${pos}`}
                checked={config[pos].show_on_assignment}
                onCheckedChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    [pos]: { ...c[pos], show_on_assignment: !!v },
                  }))
                }
              />
              <Label htmlFor={`show-${pos}`} className="text-[10px]">
                Show
              </Label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
