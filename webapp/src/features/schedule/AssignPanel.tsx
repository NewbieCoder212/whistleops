import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import {
  assignmentsApi,
  profilesApi,
  certificationLevelsApi,
  leagueQualificationsApi,
} from "@/lib/resources";
import { api, ApiError } from "@/lib/api";
import { useTranslation } from "@/i18n/I18nProvider";
import type { AssignBoardOfficial, AvailabilityStatus, Profile, Assignment } from "@shared/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { AssignTarget } from "./scheduleTypes";
import { SLOT_POSITIONS, formatGameTime } from "./scheduleTypes";
import {
  buildLevelsById,
  checkOfficialQualified,
  resolveQualificationRule,
} from "./qualification";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUS_SORT,
  resolveOfficialAvailabilityStatus,
} from "@/features/assignBoard/assignBoardUtils";
import { cn } from "@/lib/utils";

interface AssignPanelProps {
  target: AssignTarget | null;
  onClose: () => void;
  gameHour?: number;
  boardOfficials?: AssignBoardOfficial[];
  /** Pre-select official when opening from hour focus */
  preselectedOfficialId?: string | null;
  onAssigned?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  REFEREE: "Referee",
  LINESMAN: "Linesman",
};

const AVAILABILITY_BADGE_CLASS: Record<AvailabilityStatus, string> = {
  available: "text-emerald-600 dark:text-emerald-400",
  no_submission: "text-amber-600 dark:text-amber-400",
  unavailable: "text-muted-foreground",
  busy: "text-amber-700 dark:text-amber-500",
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

type ProfileRow = {
  profile: Profile;
  qualified: boolean;
  reason?: string;
  levelName?: string;
  availabilityStatus?: AvailabilityStatus;
  canAssign: boolean;
};

export function AssignPanel({
  target,
  onClose,
  gameHour,
  boardOfficials,
  preselectedOfficialId,
  onAssigned,
}: AssignPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const useBoardAvail = gameHour != null && boardOfficials != null && boardOfficials.length > 0;

  useEffect(() => {
    if (preselectedOfficialId) {
      setSelectedId(preselectedOfficialId);
    } else {
      setSelectedId(target?.assignment?.official_id ?? "");
    }
  }, [target, preselectedOfficialId]);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: profilesApi.list,
  });

  const { data: levels = [] } = useQuery({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ["league-qualifications"],
    queryFn: leagueQualificationsApi.list,
  });

  const game = target?.game;

  const boardById = useMemo(
    () => new Map(boardOfficials?.map((o) => [o.official_id, o]) ?? []),
    [boardOfficials]
  );

  const rule = useMemo(() => {
    if (!game) return null;
    return resolveQualificationRule(game, qualifications);
  }, [game, qualifications]);

  const levelsById = useMemo(() => buildLevelsById(levels), [levels]);

  const profileRows: ProfileRow[] = useMemo(() => {
    const source = useBoardAvail
      ? profiles.filter((p) => boardById.has(p.id))
      : profiles;

    const rows: ProfileRow[] = source.map((p) => {
      let qualified = true;
      let reason: string | undefined;
      let levelName = levelsById.get(p.official_level_id ?? "")?.name;

      if (rule) {
        const result = checkOfficialQualified(
          p,
          rule.minimumLevel.sort_order,
          levelsById,
          rule.minimumLevel.name,
          rule.leagueKey
        );
        qualified = result.qualified;
        reason = result.reason;
        levelName = result.officialLevelName;
      }

      let availabilityStatus: AvailabilityStatus | undefined;
      if (useBoardAvail && gameHour != null) {
        const boardRow = boardById.get(p.id);
        if (boardRow) {
          availabilityStatus = resolveOfficialAvailabilityStatus(boardRow, gameHour);
        }
      }

      const canAssign =
        qualified &&
        (!availabilityStatus ||
          availabilityStatus === "available" ||
          availabilityStatus === "no_submission");

      return { profile: p, qualified, reason, levelName, availabilityStatus, canAssign };
    });

    if (useBoardAvail) {
      return rows.sort((a, b) => {
        const sa = a.availabilityStatus
          ? AVAILABILITY_STATUS_SORT[a.availabilityStatus]
          : 99;
        const sb = b.availabilityStatus
          ? AVAILABILITY_STATUS_SORT[b.availabilityStatus]
          : 99;
        if (sa !== sb) return sa - sb;
        return (a.profile.full_name ?? a.profile.email).localeCompare(
          b.profile.full_name ?? b.profile.email
        );
      });
    }
    return rows;
  }, [profiles, rule, levelsById, useBoardAvail, boardById, gameHour]);

  const currentAssigneeId = target?.assignment?.official_id ?? null;

  const assignableRows = useMemo(() => {
    const base = profileRows.filter((r) => r.canAssign);
    if (!currentAssigneeId) return base;
    if (base.some((r) => r.profile.id === currentAssigneeId)) return base;
    const currentRow = profileRows.find((r) => r.profile.id === currentAssigneeId);
    if (!currentRow) return base;
    return [{ ...currentRow, canAssign: true }, ...base];
  }, [profileRows, currentAssigneeId]);
  const blockedRows = useMemo(
    () => profileRows.filter((r) => r.qualified && !r.canAssign),
    [profileRows]
  );
  const unqualifiedRows = useMemo(
    () => profileRows.filter((r) => !r.qualified),
    [profileRows]
  );

  const selectedRow = profileRows.find((r) => r.profile.id === selectedId);
  const selectedIsCurrentAssignee = !!selectedId && selectedId === currentAssigneeId;
  const selectedCanAssign =
    !!selectedId && (selectedIsCurrentAssignee || (selectedRow?.canAssign ?? false));

  useEffect(() => {
    if (!selectedId || selectedIsCurrentAssignee) return;
    if (!selectedRow?.canAssign) setSelectedId("");
  }, [selectedId, selectedRow, selectedIsCurrentAssignee]);

  const useDraft = !!boardOfficials;

  const saveStatus = (): Assignment["status"] => {
    if (!useDraft) return "PENDING";
    if (!target?.assignment) return "DRAFT";
    if (target.assignment.status === "DRAFT") return "DRAFT";
    return "PENDING";
  };

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: async () => {
      if (!target?.assignment) throw new Error("No assignment to remove");
      return assignmentsApi.delete(target.assignment.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      qc.invalidateQueries({ queryKey: ["assign-board"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
      onAssigned?.();
      toast.success("Assignment removed.");
      onClose();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error(e.message || "Failed to remove assignment.");
    },
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (!target || !selectedId) throw new Error("No official selected");
      if (!selectedCanAssign) throw new Error(t("assign.cannotAssign"));
      const status = saveStatus();
      if (target.assignment) {
        return api.put<Assignment>(`/api/assignments/${target.assignment.id}`, {
          official_id: selectedId,
          status,
        });
      }
      return api.post<Assignment>("/api/assignments", {
        game_id: target.game.id,
        official_id: selectedId,
        position: target.position,
        status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
      qc.invalidateQueries({ queryKey: ["assign-board"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
      onAssigned?.();
      toast.success(target?.assignment ? "Assignment updated." : "Official assigned.");
      onClose();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          toast.error("Admin sign-in required.");
          return;
        }
        toast.error(e.message, { duration: e.status === 422 ? 8000 : 4000 });
        return;
      }
      toast.error(e.message);
    },
  });

  const posConfig = SLOT_POSITIONS.find((p) => p.key === target?.position);
  const isReassign = !!target?.assignment;
  const { timeStr, dayAbbr } = game ? formatGameTime(game.date_time) : { timeStr: "", dayAbbr: "" };

  const requirementBanner = rule
    ? interpolate(t("assign.requiresLevel"), {
        level: rule.minimumLevel.name,
        league: rule.leagueKey,
      })
    : game && (game.league_tier || game.league_type)
      ? t("assign.noRule")
      : null;

  function renderOfficialOption(row: ProfileRow, disabled?: boolean) {
    const p = row.profile;
    return (
      <SelectItem key={p.id} value={p.id} disabled={disabled}>
        <span className={disabled ? "text-muted-foreground" : "font-medium"}>
          {p.full_name ?? p.email}
        </span>
        {row.levelName ? (
          <span className="ml-2 text-xs text-muted-foreground">{row.levelName}</span>
        ) : null}
        {row.availabilityStatus ? (
          <span
            className={cn(
              "ml-2 text-xs font-medium",
              AVAILABILITY_BADGE_CLASS[row.availabilityStatus]
            )}
          >
            · {AVAILABILITY_LABELS[row.availabilityStatus]}
          </span>
        ) : null}
        {row.reason ? (
          <span className="ml-1 text-xs text-muted-foreground">({row.reason})</span>
        ) : null}
      </SelectItem>
    );
  }

  return (
    <Sheet open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            {isReassign ? t("assign.reassign") : "Assign"} {posConfig?.label ?? target?.position}
          </SheetTitle>
          <SheetDescription>
            {isReassign
              ? `Currently: ${target?.assignment?.official?.full_name ?? "Unknown"}. Pick another official or remove the assignment.`
              : useBoardAvail
                ? "Officials sorted by availability for this game time."
                : "Choose an official to fill this position."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {game ? (
          <div className="px-6 py-4 bg-secondary/30 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Game</p>
            <p className="text-sm font-semibold">
              {game.home_team ?? "TBD"}{" "}
              <span className="font-normal text-muted-foreground">vs</span>{" "}
              {game.away_team ?? "TBD"}
            </p>
            <p className="text-xs text-muted-foreground">
              {dayAbbr} · {timeStr}
              {game.venue ? ` · ${game.venue.name}` : ""}
              {game.league_tier ? ` · ${game.league_tier}` : ""}
              {game.league_type && !game.league_tier ? ` · ${game.league_type}` : ""}
            </p>
          </div>
        ) : null}

        {requirementBanner ? (
          <div className="px-6 pt-3">
            <Alert className="border-secondary/30 bg-secondary/10">
              <AlertCircle className="h-4 w-4 text-secondary" />
              <AlertDescription className="text-xs">{requirementBanner}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {selectedId && !selectedCanAssign ? (
          <div className="px-6 pt-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {selectedRow?.reason ??
                  (selectedRow?.availabilityStatus
                    ? `${AVAILABILITY_LABELS[selectedRow.availabilityStatus]} for this time`
                    : t("assign.cannotAssign"))}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <Separator className="mt-3" />

        <div className="flex-1 px-6 py-5 space-y-3 overflow-y-auto">
          <label className="text-sm font-medium">{t("assign.official")}</label>
          {loadingProfiles ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("assign.loadingOfficials")}
            </div>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("assign.chooseOfficial")} />
              </SelectTrigger>
              <SelectContent className="max-h-[min(320px,50vh)]">
                {assignableRows.map((row) => renderOfficialOption(row))}
                {blockedRows.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pointer-events-none">
                      Not available / busy
                    </div>
                    {blockedRows.map((row) => renderOfficialOption(row, true))}
                  </>
                ) : null}
                {unqualifiedRows.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pointer-events-none">
                      {t("assign.notQualified")}
                    </div>
                    {unqualifiedRows.map((row) => renderOfficialOption(row, true))}
                  </>
                ) : null}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
          {isReassign ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={isPending || isRemoving}
              onClick={() => remove()}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isPending || isRemoving}>
              {t("assign.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={!selectedId || !selectedCanAssign || isPending || isRemoving}
              onClick={() => save()}
              className="gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("assign.saving")}
                </>
              ) : isReassign ? (
                t("assign.reassign")
              ) : (
                t("assign.saveAssignment")
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
