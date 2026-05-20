import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import { profilesApi, certificationLevelsApi, leagueQualificationsApi } from "@/lib/resources";
import { api, ApiError } from "@/lib/api";
import { useTranslation } from "@/i18n/I18nProvider";
import type { Profile, Assignment } from "@shared/types";
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

interface AssignPanelProps {
  target: AssignTarget | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  REFEREE: "Referee",
  LINESMAN: "Linesman",
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function AssignPanel({ target, onClose }: AssignPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    setSelectedId(target?.assignment?.official_id ?? "");
  }, [target]);

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

  const rule = useMemo(() => {
    if (!game) return null;
    return resolveQualificationRule(game, qualifications);
  }, [game, qualifications]);

  const levelsById = useMemo(() => buildLevelsById(levels), [levels]);

  const profileRows = useMemo(() => {
    if (!rule) {
      return profiles.map((p) => ({
        profile: p,
        qualified: true as const,
        reason: undefined as string | undefined,
        levelName: levelsById.get(p.official_level_id ?? "")?.name,
      }));
    }

    const minSort = rule.minimumLevel.sort_order;
    const minName = rule.minimumLevel.name;
    const leagueLabel = rule.leagueKey;

    return profiles.map((p) => {
      const result = checkOfficialQualified(p, minSort, levelsById, minName, leagueLabel);
      return {
        profile: p,
        qualified: result.qualified,
        reason: result.reason,
        levelName: result.officialLevelName,
      };
    });
  }, [profiles, rule, levelsById]);

  const qualifiedRows = useMemo(
    () => profileRows.filter((r) => r.qualified),
    [profileRows]
  );
  const unqualifiedRows = useMemo(
    () => profileRows.filter((r) => !r.qualified),
    [profileRows]
  );

  const selectedRow = profileRows.find((r) => r.profile.id === selectedId);
  const selectedQualified = selectedRow?.qualified ?? false;

  useEffect(() => {
    if (!selectedId || !rule) return;
    if (!selectedQualified) setSelectedId("");
  }, [selectedId, selectedQualified, rule]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (!target || !selectedId) throw new Error("No official selected");
      if (!selectedQualified) throw new Error(t("assign.cannotAssign"));
      if (target.assignment) {
        return api.put<Assignment>(`/api/assignments/${target.assignment.id}`, {
          official_id: selectedId,
          status: "PENDING",
        });
      }
      return api.post<Assignment>("/api/assignments", {
        game_id: target.game.id,
        official_id: selectedId,
        position: target.position,
        status: "PENDING",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-games"] });
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
              ? `Currently: ${target.assignment?.official?.full_name ?? "Unknown"}`
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

        {selectedId && !selectedQualified ? (
          <div className="px-6 pt-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {selectedRow?.reason ?? t("assign.cannotAssign")}
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
                {qualifiedRows.map(({ profile: p, levelName }) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.full_name ?? p.email}</span>
                    {levelName ? (
                      <span className="ml-2 text-xs text-muted-foreground">{levelName}</span>
                    ) : null}
                    {p.official_type ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {TYPE_LABELS[p.official_type] ?? p.official_type}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
                {unqualifiedRows.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pointer-events-none">
                      {t("assign.notQualified")}
                    </div>
                    {unqualifiedRows.map(({ profile: p, reason, levelName }) => (
                      <SelectItem key={p.id} value={p.id} disabled>
                        <span className="text-muted-foreground">
                          {p.full_name ?? p.email}
                          {levelName ? ` — ${levelName}` : ` — ${t("assign.noLevelSet")}`}
                          {reason ? ` (${reason})` : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                ) : null}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {t("assign.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!selectedId || !selectedQualified || isPending}
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
      </SheetContent>
    </Sheet>
  );
}
