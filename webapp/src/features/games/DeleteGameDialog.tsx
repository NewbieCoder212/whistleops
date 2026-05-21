import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { gamesApi } from "@/lib/resources";
import type { ScheduleGame } from "@/features/schedule/scheduleTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteGameDialogProps {
  game: ScheduleGame | null;
  onClose: () => void;
}

export function DeleteGameDialog({ game, onClose }: DeleteGameDialogProps) {
  const qc = useQueryClient();
  const open = game != null;
  const assignmentCount = game?.assignments.length ?? 0;

  const { mutate, isPending } = useMutation({
    mutationFn: () => gamesApi.delete(game!.id),
    onSuccess: () => {
      toast.success("Game deleted.");
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      qc.invalidateQueries({ queryKey: ["assign-board"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete game?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {game ? (
              <>
                Remove <strong>{game.home_team}</strong> vs <strong>{game.away_team}</strong> from
                the schedule. This cannot be undone.
                {assignmentCount > 0 ? (
                  <>
                    {" "}
                    {assignmentCount} assignment{assignmentCount !== 1 ? "s" : ""} on this game
                    will also be removed.
                  </>
                ) : null}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              mutate();
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Deleting…
              </>
            ) : (
              "Delete game"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
