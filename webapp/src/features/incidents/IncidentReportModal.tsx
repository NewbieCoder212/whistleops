import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ScheduleGame } from "@/features/schedule/scheduleTypes";
import { formatGameTime } from "@/features/schedule/scheduleTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface IncidentReportModalProps {
  game: ScheduleGame | null;
  onClose: () => void;
}

export function IncidentReportModal({ game, onClose }: IncidentReportModalProps) {
  const [body, setBody] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post<{ report: unknown; emails_sent: number }>("/api/incidents", {
        game_id: game!.id,
        body: body.trim(),
      }),
    onSuccess: (res) => {
      toast.success(
        `Incident submitted${res.emails_sent > 0 ? ` — ${res.emails_sent} email(s) sent` : ""}.`
      );
      setBody("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { timeStr, dayAbbr } = game
    ? formatGameTime(game.date_time)
    : { timeStr: "", dayAbbr: "" };

  return (
    <Dialog open={!!game} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Incident report
          </DialogTitle>
          <DialogDescription>
            Submit a report for this game. Configured league contacts will be emailed automatically.
          </DialogDescription>
        </DialogHeader>
        {game ? (
          <div className="space-y-4">
            <p className="text-sm">
              {game.home_team} vs {game.away_team} · {dayAbbr} {timeStr}
            </p>
            <div className="space-y-2">
              <Label htmlFor="incident-body">Report details</Label>
              <Textarea
                id="incident-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Describe the incident…"
                maxLength={10000}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            disabled={!body.trim() || isPending}
            onClick={() => mutate()}
            className="gap-1.5"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
