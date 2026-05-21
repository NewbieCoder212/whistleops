import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { assignBoardApi } from "@/lib/resources";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AssignmentBoardPublishBarProps {
  date: string;
  zoneId: string;
  zoneName: string;
  leagueType: string | null;
  draftCount: number;
}

export function AssignmentBoardPublishBar({
  date,
  zoneId,
  zoneName,
  leagueType,
  draftCount,
}: AssignmentBoardPublishBarProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { mutate: publish, isPending } = useMutation({
    mutationFn: () =>
      assignBoardApi.publish({
        date,
        zoneId,
        leagueType: leagueType ?? undefined,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["assign-board"] });
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      setOpen(false);

      if (result.published_count === 0) {
        toast.info("No draft assignments to publish for this day.");
        return;
      }

      let msg = `Published ${result.published_count} assignment${result.published_count !== 1 ? "s" : ""} for ${result.officials_notified} official${result.officials_notified !== 1 ? "s" : ""}.`;
      if (result.email_skipped) {
        msg += " Email is not configured — officials will see assignments in the app only.";
      } else if (result.emails_sent > 0) {
        msg += ` Sent ${result.emails_sent} email${result.emails_sent !== 1 ? "s" : ""}.`;
      }
      if (result.emails_failed.length > 0) {
        toast.warning(msg, { duration: 8000 });
      } else {
        toast.success(msg);
      }
    },
    onError: (e: Error) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error(e.message || "Failed to publish assignments.");
    },
  });

  if (draftCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-500/35 bg-violet-500/10 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-violet-950 dark:text-violet-100">
          {draftCount} draft assignment{draftCount !== 1 ? "s" : ""} — not visible to officials yet
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Publish sends assignments to officials on My Schedule and emails each person their new
          games for {zoneName} on this date.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Send className="h-3.5 w-3.5" />
            Publish day
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish assignments for {date}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will release {draftCount} draft assignment{draftCount !== 1 ? "s" : ""} in{" "}
              <span className="font-medium text-foreground">{zoneName}</span> to officials as pending
              (accept/decline). Each affected official receives one email listing their new games,
              when email is configured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                publish();
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Publishing…
                </>
              ) : (
                "Publish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
