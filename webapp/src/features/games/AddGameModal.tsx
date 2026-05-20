import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import type { GameCreate, LeagueType } from "@shared/types";
import { gamesApi, venuesApi } from "@/lib/resources";
import { buildGameDateTimeIso } from "./buildGameDateTime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const LEAGUE_TYPES: LeagueType[] = ["Minor", "Senior", "Adult Rec"];

const emptyForm = () => ({
  date: "",
  time: "",
  venueId: "",
  homeTeam: "",
  awayTeam: "",
  leagueTier: "",
  leagueType: "" as "" | LeagueType,
  gameNumber: "",
  gamesheetId: "",
  notes: "",
});

interface AddGameModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddGameModal({ open, onClose }: AddGameModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["venues", "assignable"],
    queryFn: () => venuesApi.list({ assignable: true }),
    enabled: open,
  });

  const resetAndClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (body: GameCreate) => gamesApi.create(body),
    onSuccess: () => {
      toast.success("Game added to schedule.");
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      resetAndClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const home = form.homeTeam.trim();
    const away = form.awayTeam.trim();
    if (!home || !away) {
      toast.error("Home and away team names are required.");
      return;
    }
    const date_time = buildGameDateTimeIso(form.date, form.time);
    if (!date_time) {
      toast.error("Enter a valid date and time.");
      return;
    }

    const body: GameCreate = {
      date_time,
      home_team: home,
      away_team: away,
      status: "UNASSIGNED",
      ...(form.venueId ? { venue_id: form.venueId } : {}),
      ...(form.leagueTier.trim() ? { league_tier: form.leagueTier.trim() } : {}),
      ...(form.leagueType ? { league_type: form.leagueType } : {}),
      ...(form.gameNumber.trim()
        ? { game_number: parseInt(form.gameNumber, 10) }
        : {}),
      ...(form.gamesheetId.trim()
        ? { gamesheet_external_id: form.gamesheetId.trim() }
        : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };

    if (body.game_number != null && Number.isNaN(body.game_number)) {
      toast.error("Game number must be a whole number.");
      return;
    }

    mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add game
          </DialogTitle>
          <DialogDescription>
            Create a single game on the schedule. You can also bulk-import from CSV.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-game-date">Date</Label>
              <Input
                id="add-game-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-game-time">Time</Label>
              <Input
                id="add-game-time"
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-game-venue">Venue (rink)</Label>
            <Select
              value={form.venueId || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, venueId: v === "__none__" ? "" : v }))
              }
              disabled={venuesLoading}
            >
              <SelectTrigger id="add-game-venue">
                <SelectValue placeholder={venuesLoading ? "Loading…" : "Select venue"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No venue</SelectItem>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!venuesLoading && venues.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No assignable venues — add rinks in Configuration first.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-game-home">Home team</Label>
              <Input
                id="add-game-home"
                required
                value={form.homeTeam}
                onChange={(e) => setForm((f) => ({ ...f, homeTeam: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-game-away">Away team</Label>
              <Input
                id="add-game-away"
                required
                value={form.awayTeam}
                onChange={(e) => setForm((f) => ({ ...f, awayTeam: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-game-tier">League / tier</Label>
              <Input
                id="add-game-tier"
                placeholder="e.g. U15 A"
                value={form.leagueTier}
                onChange={(e) => setForm((f) => ({ ...f, leagueTier: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>League type</Label>
              <Select
                value={form.leagueType || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    leagueType: v === "__none__" ? "" : (v as LeagueType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {LEAGUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-game-number">Game number</Label>
              <Input
                id="add-game-number"
                type="number"
                min={1}
                value={form.gameNumber}
                onChange={(e) => setForm((f) => ({ ...f, gameNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-game-gs">Gamesheet ID</Label>
              <Input
                id="add-game-gs"
                placeholder="Optional — for webhook sync"
                value={form.gamesheetId}
                onChange={(e) => setForm((f) => ({ ...f, gamesheetId: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-game-notes">Notes</Label>
            <Textarea
              id="add-game-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add game"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
