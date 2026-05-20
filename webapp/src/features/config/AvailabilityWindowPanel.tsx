import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Save } from "lucide-react";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import type { AvailabilityWindow } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AvailabilityWindowPanel() {
  const qc = useQueryClient();
  const [window, setWindow] = useState<AvailabilityWindow>({});

  const { data: setting, isLoading } = useQuery({
    queryKey: ["settings", "availability_window"],
    queryFn: async () => {
      try {
        return await settingsApi.get("availability_window");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  useEffect(() => {
    if (setting?.value) setWindow(setting.value as AvailabilityWindow);
  }, [setting?.value]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.upsert("availability_window", window),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "availability_window"] });
      toast.success("Availability window saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Availability date range
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Officials can only submit availability between these dates (leave blank for no limit).
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="avail-open">Open date</Label>
          <Input
            id="avail-open"
            type="date"
            value={window.open_date ?? ""}
            onChange={(e) => setWindow((w) => ({ ...w, open_date: e.target.value || null }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avail-close">Close date</Label>
          <Input
            id="avail-close"
            type="date"
            value={window.close_date ?? ""}
            onChange={(e) => setWindow((w) => ({ ...w, close_date: e.target.value || null }))}
          />
        </div>
      </div>
    </section>
  );
}
