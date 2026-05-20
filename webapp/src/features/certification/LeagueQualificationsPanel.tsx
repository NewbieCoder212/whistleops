import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, AlertCircle, Trophy } from "lucide-react";
import { certificationLevelsApi, leagueQualificationsApi } from "@/lib/resources";
import type { LeagueQualificationWithLevel } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type LeagueWithLevel = LeagueQualificationWithLevel;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Trophy className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No league qualifications yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add a league and select the minimum certification level required.
      </p>
    </div>
  );
}

export function LeagueQualificationsPanel() {
  const qc = useQueryClient();
  const [leagueName, setLeagueName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeagueWithLevel | null>(null);

  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });

  const { data: qualifications = [], isLoading, isError } = useQuery({
    queryKey: ["league-qualifications"],
    queryFn: leagueQualificationsApi.list,
  });

  const addMutation = useMutation({
    mutationFn: leagueQualificationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-qualifications"] });
      setLeagueName("");
      setLevelId("");
      toast.success("League added");
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("unique") ? "A league with that name already exists." : e.message
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leagueQualificationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-qualifications"] });
      setDeleteTarget(null);
      toast.success("League removed");
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeleteTarget(null);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim() || !levelId) return;
    addMutation.mutate({
      league_name: leagueName.trim(),
      minimum_level_id: levelId,
    });
  };

  const canAdd = leagueName.trim() && levelId && !addMutation.isPending;
  const noLevels = !levelsLoading && levels.length === 0;

  return (
    <section className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">League Qualifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Minimum certification level an official needs to work each league.
          </p>
        </div>
        <Badge variant="secondary">{qualifications.length}</Badge>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="px-5 py-3 border-b border-border flex gap-2 flex-wrap">
        <Input
          placeholder="League name (e.g. U18 AAA)"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          className="flex-1 min-w-[160px] h-8 text-sm"
        />
        <Select value={levelId} onValueChange={setLevelId} disabled={noLevels}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue
              placeholder={noLevels ? "Add levels first" : "Min. level required"}
            />
          </SelectTrigger>
          <SelectContent>
            {levels.map((lv) => (
              <SelectItem key={lv.id} value={lv.id}>
                {lv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="sm"
          disabled={!canAdd}
          className="h-8 gap-1.5"
        >
          {addMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </form>

      {/* Table header */}
      {!isLoading && qualifications.length > 0 && (
        <div className="px-5 py-2 grid grid-cols-[1fr_auto_auto] gap-4 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>League</span>
          <span>Min. Level</span>
          <span className="w-7" />
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-7" />
            </div>
          ))
        ) : isError ? (
          <div className="px-5 py-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Failed to load qualifications. Make sure you're signed in as admin.
          </div>
        ) : qualifications.length === 0 ? (
          <EmptyState />
        ) : (
          (qualifications as LeagueWithLevel[]).map((q) => (
            <div
              key={q.id}
              className="px-5 py-3 grid grid-cols-[1fr_auto_auto] gap-4 items-center group hover:bg-secondary/40 transition-colors"
            >
              <span className="text-sm font-medium truncate">{q.league_name}</span>
              <span>
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-primary border-primary/30"
                >
                  {q.minimum_level?.name ??
                    levels.find((l) => l.id === q.minimum_level_id)?.name ??
                    "—"}
                </Badge>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                onClick={() => setDeleteTarget(q)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.league_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the minimum certification requirement for this league. Games
              already scheduled won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
