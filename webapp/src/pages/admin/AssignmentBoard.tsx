import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  ScheduleDayBoardSection,
  type ScheduleDayBoardAssignContext,
} from "@/features/schedule/ScheduleDayBoardSection";
import { AssignPanel } from "@/features/schedule/AssignPanel";
import type { AssignTarget, ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";
import {
  addDaysIso,
  resolveDefaultZoneId,
  saveZonePreference,
  todayIso,
  zoneSelectLabel,
} from "@/features/filters/scheduleFilterUtils";
import { LEAGUE_TYPES } from "@/features/filters/ZoneLeagueFilter";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Position, Zone } from "@shared/types";

export default function AssignmentBoardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const zoneInitialized = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFromUrl = searchParams.get("date");
  const initialDate =
    dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl) ? dateFromUrl : todayIso();

  const [date, setDate] = useState(initialDate);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [leagueType, setLeagueType] = useState<string | null>(null);
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [preselectedOfficialId, setPreselectedOfficialId] = useState<string | null>(null);
  const [dayBoardContext, setDayBoardContext] = useState<ScheduleDayBoardAssignContext>({});

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => api.get<Zone[]>("/api/zones"),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile || zoneInitialized.current || zones.length === 0) return;
    zoneInitialized.current = true;
    const id = resolveDefaultZoneId({
      userId: user?.id,
      profileZoneId: profile.zone_id,
      role: profile.role,
      zoneIds: zones.map((z) => z.id),
    });
    if (id) setZoneId(id);
  }, [profile, user?.id, zones]);

  useEffect(() => {
    if (zoneId && zones.length > 0 && !zones.some((z) => z.id === zoneId)) {
      setZoneId(zones[0]!.id);
    }
  }, [zones, zoneId]);

  useEffect(() => {
    if (searchParams.get("date") !== date) {
      setSearchParams({ date }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL when date changes
  }, [date]);

  const handleZoneChange = (id: string) => {
    setZoneId(id);
    saveZonePreference(user?.id, id);
  };

  const handleAssignContextChange = useCallback((ctx: ScheduleDayBoardAssignContext) => {
    setDayBoardContext(ctx);
  }, []);

  const handleSlotClick = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null
  ) => {
    setPreselectedOfficialId(null);
    setTarget({ game, position, assignment });
  };

  const handlePickOfficial = (
    game: ScheduleGame,
    position: Position,
    assignment: ScheduleAssignment | null,
    officialId: string
  ) => {
    setPreselectedOfficialId(officialId);
    setTarget({ game, position, assignment });
  };

  const handleAssigned = () => {
    qc.invalidateQueries({ queryKey: ["assign-board"] });
    qc.invalidateQueries({ queryKey: ["schedule-games"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Assignment Board
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign crew for one day using availability and open-slot hints. You can switch to any
              zone; your profile home zone is selected by default.{" "}
              <Link to="/admin/schedule" className="text-primary hover:underline">
                Schedule
              </Link>{" "}
              is for the week view — add games, message crew, and incidents.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDate((d) => addDaysIso(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDate((d) => addDaysIso(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={zoneId ?? ""} onValueChange={handleZoneChange}>
            <SelectTrigger className="h-8 min-w-[180px] text-xs">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {zoneSelectLabel(z.name, z.id, profile?.zone_id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            {LEAGUE_TYPES.map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setLeagueType(leagueType === lt ? null : lt)}
                className={cn(
                  "h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                  leagueType === lt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

        <ScheduleDayBoardSection
          date={date}
          zoneId={zoneId}
          leagueType={leagueType}
          target={target}
          onSlotClick={handleSlotClick}
          onPickOfficial={handlePickOfficial}
          onAssignContextChange={handleAssignContextChange}
        />
      </div>

      <AssignPanel
        target={target}
        onClose={() => {
          setTarget(null);
          setPreselectedOfficialId(null);
        }}
        gameHour={dayBoardContext.gameHour}
        boardOfficials={dayBoardContext.boardOfficials}
        preselectedOfficialId={preselectedOfficialId}
        onAssigned={handleAssigned}
      />
    </AdminLayout>
  );
}
