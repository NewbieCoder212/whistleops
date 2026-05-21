import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import type { GameStatus, GameUpdate, LeagueType } from "@shared/types";
import { gamesApi, venuesApi } from "@/lib/resources";
import { buildGameDateTimeIso, parseGameDateTimeIso } from "./buildGameDateTime";
import {
  filterVenuesForScheduleZone,
  validateVenueForScheduleZone,
} from "./gameVenueZone";
import type { ScheduleGame } from "@/features/schedule/scheduleTypes";
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
import { Checkbox } from "@/components/ui/checkbox";
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
const GAME_STATUSES: GameStatus[] = ["UNASSIGNED", "ASSIGNED", "COMPLETED", "CANCELLED"];

function gameToForm(game: ScheduleGame) {
  const dt = parseGameDateTimeIso(game.date_time);
  return {
    date: dt?.date ?? "",
    time: dt?.time ?? "",
    venueId: game.venue_id ?? game.venue?.id ?? "",
    homeTeam: game.home_team ?? "",
    awayTeam: game.away_team ?? "",
    leagueTier: game.league_tier ?? "",
    leagueType: (game.league_type ?? "") as "" | LeagueType,
    gameNumber: game.game_number != null ? String(game.game_number) : "",
    gamesheetId: game.gamesheet_external_id ?? "",
    notes: game.notes ?? "",
    isCashGame: game.is_cash_game === true,
    status: game.status,
  };
}

interface EditGameModalProps {
  game: ScheduleGame | null;
  onClose: () => void;
  scheduleZoneId?: string | null;
  scheduleZoneName?: string | null;
}

export function EditGameModal({
  game,
  onClose,
  scheduleZoneId = null,
  scheduleZoneName = null,
}: EditGameModalProps) {
  const qc = useQueryClient();
  const open = game != null;
  const [form, setForm] = useState(() => (game ? gameToForm(game) : null));

  useEffect(() => {
    if (game) setForm(gameToForm(game));
  }, [game]);

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["venues", "assignable"],
    queryFn: () => venuesApi.list({ assignable: true }),
    enabled: open,
  });

  const venueOptions = useMemo(
    () =>
      filterVenuesForScheduleZone(venues, scheduleZoneId, form?.venueId || game?.venue_id),
    [venues, scheduleZoneId, form?.venueId, game?.venue_id]
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (body: GameUpdate) => gamesApi.update(game!.id, body),
    onSuccess: () => {
      toast.success("Game updated.");
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      qc.invalidateQueries({ queryKey: ["assign-board"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!game || !form) return null;

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

    const venueError = validateVenueForScheduleZone(venues, form.venueId, scheduleZoneId);
    if (venueError) {
      toast.error(venueError);
      return;
    }

    const body: GameUpdate = {
      date_time,
      home_team: home,
      away_team: away,
      status: form.status,
      venue_id: form.venueId || null,
      league_tier: form.leagueTier.trim() || null,
      league_type: form.leagueType || null,
      game_number: form.gameNumber.trim() ? parseInt(form.gameNumber, 10) : null,
      gamesheet_external_id: form.gamesheetId.trim() || null,
      notes: form.notes.trim() || null,
      is_cash_game: form.isCashGame,
    };

    if (body.game_number != null && Number.isNaN(body.game_number)) {
      toast.error("Game number must be a whole number.");
      return;
    }

    mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit game
          </DialogTitle>
          <DialogDescription>
            {game.home_team} vs {game.away_team}. Zone is set by the rink.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-game-date">Date</Label>
              <Input
                id="edit-game-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => f && { ...f, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-game-time">Time</Label>
              <Input
                id="edit-game-time"
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm((f) => f && { ...f, time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-game-venue">Venue (rink)</Label>
            <Select
              value={form.venueId || "__none__"}
              onValueChange={(v) =>
                setForm((f) => f && { ...f, venueId: v === "__none__" ? "" : v })
              }
              disabled={venuesLoading}
            >
              <SelectTrigger id="edit-game-venue">
                <SelectValue placeholder={venuesLoading ? "Loading…" : "Select venue"} />
              </SelectTrigger>
              <SelectContent>
                {!scheduleZoneId ? (
                  <SelectItem value="__none__">No venue</SelectItem>
                ) : null}
                {venueOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scheduleZoneId ? (
              <p className="text-xs text-muted-foreground">
                Showing rinks in{" "}
                <span className="font-medium text-foreground">
                  {scheduleZoneName ?? "this zone"}
                </span>
                .
              </p>
            ) : null}
            {!venuesLoading && scheduleZoneId && venueOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No assignable rinks in this zone. Assign zones under{" "}
                <Link to="/admin/config" className="text-primary hover:underline">
                  Configuration → Assignable rinks
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-game-home">Home team</Label>
              <Input
                id="edit-game-home"
                required
                value={form.homeTeam}
                onChange={(e) => setForm((f) => f && { ...f, homeTeam: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-game-away">Away team</Label>
              <Input
                id="edit-game-away"
                required
                value={form.awayTeam}
                onChange={(e) => setForm((f) => f && { ...f, awayTeam: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-game-tier">League / tier</Label>
              <Input
                id="edit-game-tier"
                value={form.leagueTier}
                onChange={(e) => setForm((f) => f && { ...f, leagueTier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>League type</Label>
              <Select
                value={form.leagueType || "__none__"}
                onValueChange={(v) =>
                  setForm((f) =>
                    f ? { ...f, leagueType: v === "__none__" ? "" : (v as LeagueType) } : f
                  )
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
              <Label htmlFor="edit-game-number">Game number</Label>
              <Input
                id="edit-game-number"
                type="number"
                min={1}
                value={form.gameNumber}
                onChange={(e) => setForm((f) => f && { ...f, gameNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => f && { ...f, status: v as GameStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-game-gs">Gamesheet ID</Label>
            <Input
              id="edit-game-gs"
              value={form.gamesheetId}
              onChange={(e) => setForm((f) => f && { ...f, gamesheetId: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-game-cash"
              checked={form.isCashGame}
              onCheckedChange={(v) =>
                setForm((f) => f && { ...f, isCashGame: v === true })
              }
            />
            <Label htmlFor="edit-game-cash" className="text-sm font-normal cursor-pointer">
              Cash game (paid at rink)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-game-notes">Notes</Label>
            <Textarea
              id="edit-game-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => f && { ...f, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
