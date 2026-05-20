import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Loader2, AlertCircle } from "lucide-react";
import { certificationLevelsApi } from "@/lib/resources";
import type { CertificationLevel } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No certification levels yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add your first level using the form above.
      </p>
    </div>
  );
}

export function CertificationLevelsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CertificationLevel | null>(null);

  const { data: levels = [], isLoading, isError } = useQuery({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });

  const addMutation = useMutation({
    mutationFn: certificationLevelsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certification-levels"] });
      setName("");
      setSortOrder("");
      toast.success("Level added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => certificationLevelsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certification-levels"] });
      qc.invalidateQueries({ queryKey: ["league-qualifications"] });
      setDeleteTarget(null);
      toast.success("Level removed");
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("foreign key") ? "Level is in use by a league — remove it there first." : e.message);
      setDeleteTarget(null);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate({
      name: name.trim(),
      sort_order: sortOrder ? Number(sortOrder) : levels.length * 10,
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Certification Levels</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defines the official hierarchy (e.g. Level 1 → Level 6, Supervisor).
          </p>
        </div>
        <Badge variant="secondary">{levels.length}</Badge>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="px-5 py-3 border-b border-border flex gap-2">
        <Input
          placeholder="Level name (e.g. Level 3)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 h-8 text-sm"
        />
        <Input
          placeholder="Order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-20 h-8 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || addMutation.isPending}
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

      {/* List */}
      <div className="divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : isError ? (
          <div className="px-5 py-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Failed to load levels. Make sure you're signed in as admin.
          </div>
        ) : levels.length === 0 ? (
          <EmptyState />
        ) : (
          levels.map((level) => (
            <div
              key={level.id}
              className="px-5 py-3 flex items-center gap-3 group hover:bg-secondary/40 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium">{level.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                order {level.sort_order}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                onClick={() => setDeleteTarget(level)}
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
            <AlertDialogTitle>Remove "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Any league qualifications referencing this level must be
              removed first.
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
