import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2, Plus, Trash2 } from "lucide-react";
import { venuesApi } from "@/lib/resources";
import { api } from "@/lib/api";
import type { Venue, Zone } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function VenuesPanel() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: venuesApi.list,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Venue> }) =>
      venuesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: () => venuesApi.create({ name: newName.trim(), assignable: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
      setNewName("");
      toast.success("Venue added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => venuesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Assignable rinks
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Only assignable venues appear on the schedule. Non-assignable rinks stay in the database for history.
        </p>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="New rink name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-8"
        />
        <Button
          size="sm"
          className="gap-1"
          disabled={!newName.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading venues…</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden max-h-[320px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Assignable</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>
                    <Select
                      value={v.zone_id ?? "__none__"}
                      onValueChange={(zoneId) =>
                        updateMutation.mutate({
                          id: v.id,
                          body: { zone_id: zoneId === "__none__" ? undefined : zoneId },
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`assignable-${v.id}`}
                        checked={v.assignable !== false}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: v.id,
                            body: { assignable: !!checked },
                          })
                        }
                      />
                      <Label htmlFor={`assignable-${v.id}`} className="text-xs">
                        Yes
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
