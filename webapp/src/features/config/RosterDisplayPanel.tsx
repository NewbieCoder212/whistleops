import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Columns3 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import {
  DEFAULT_ROSTER_DISPLAY_FIELDS,
  type RosterDisplayField,
} from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FIELD_LABELS: Record<RosterDisplayField, string> = {
  full_name: "Name",
  email: "Email",
  cell_phone: "Phone",
  official_type: "Type",
  certification_level: "Cert level",
  zone: "Zone",
  distance_km: "Distance (km)",
  jersey_number: "Jersey #",
  role: "Role",
};

const ALL_FIELDS = Object.keys(FIELD_LABELS) as RosterDisplayField[];

export function RosterDisplayPanel() {
  const qc = useQueryClient();
  const [fields, setFields] = useState<RosterDisplayField[]>(DEFAULT_ROSTER_DISPLAY_FIELDS);

  const { data: setting, isLoading } = useQuery({
    queryKey: ["settings", "roster_display_fields"],
    queryFn: async () => {
      try {
        return await settingsApi.get("roster_display_fields");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  useEffect(() => {
    if (setting?.value && Array.isArray(setting.value)) {
      setFields(setting.value as RosterDisplayField[]);
    }
  }, [setting?.value]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.upsert("roster_display_fields", fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "roster_display_fields"] });
      toast.success("Roster columns saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (f: RosterDisplayField) => {
    setFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-primary" />
            Roster columns
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Choose which fields appear on the Officials roster table.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ALL_FIELDS.map((f) => (
          <div key={f} className="flex items-center gap-2">
            <Checkbox id={`col-${f}`} checked={fields.includes(f)} onCheckedChange={() => toggle(f)} />
            <Label htmlFor={`col-${f}`} className="text-sm font-normal">
              {FIELD_LABELS[f]}
            </Label>
          </div>
        ))}
      </div>
    </section>
  );
}
