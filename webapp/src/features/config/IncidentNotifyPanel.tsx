import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { ApiError } from "@/lib/api";
import { settingsApi } from "@/lib/resources";
import type { IncidentNotifyEmails, LeagueType } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LEAGUES: LeagueType[] = ["Minor", "Senior", "Adult Rec"];

const EMPTY: IncidentNotifyEmails = {
  Minor: [],
  Senior: [],
  "Adult Rec": [],
  default: [],
};

export function IncidentNotifyPanel() {
  const qc = useQueryClient();
  const [emails, setEmails] = useState<IncidentNotifyEmails>(EMPTY);
  const [draft, setDraft] = useState<Record<string, string>>({
    Minor: "",
    Senior: "",
    "Adult Rec": "",
    default: "",
  });

  const { data: setting, isLoading } = useQuery({
    queryKey: ["settings", "incident_notify_emails"],
    queryFn: async () => {
      try {
        return await settingsApi.get("incident_notify_emails");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  useEffect(() => {
    if (setting?.value) {
      const v = setting.value as IncidentNotifyEmails;
      setEmails(v);
      setDraft({
        Minor: (v.Minor ?? []).join(", "),
        Senior: (v.Senior ?? []).join(", "),
        "Adult Rec": (v["Adult Rec"] ?? []).join(", "),
        default: (v.default ?? []).join(", "),
      });
    }
  }, [setting?.value]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsed: IncidentNotifyEmails = {
        Minor: draft.Minor.split(",").map((s) => s.trim()).filter(Boolean),
        Senior: draft.Senior.split(",").map((s) => s.trim()).filter(Boolean),
        "Adult Rec": draft["Adult Rec"].split(",").map((s) => s.trim()).filter(Boolean),
        default: draft.default.split(",").map((s) => s.trim()).filter(Boolean),
      };
      return settingsApi.upsert("incident_notify_emails", parsed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "incident_notify_emails"] });
      toast.success("Incident notification emails saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Incident report notifications
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Comma-separated emails notified when an incident is submitted (by league type).
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <div className="space-y-3 max-w-lg">
        {(["default", ...LEAGUES] as const).map((key) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{key === "default" ? "Default (all leagues)" : key}</Label>
            <Input
              className="h-8 text-sm"
              placeholder="email1@example.com, email2@example.com"
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
