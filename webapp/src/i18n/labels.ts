import type { AssignmentStatus } from "@shared/types";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const LEAGUE_TYPE_KEYS: Record<string, string> = {
  Minor: "filters.league.minor",
  Senior: "filters.league.senior",
  "Adult Rec": "filters.league.adultRec",
};

export function leagueTypeLabel(lt: string, t: TFn): string {
  const key = LEAGUE_TYPE_KEYS[lt];
  return key ? t(key) : lt;
}

export function zoneSelectLabel(
  name: string,
  zoneId: string,
  homeZoneId: string | null | undefined,
  t: TFn
): string {
  if (homeZoneId && zoneId === homeZoneId) {
    return `${name} (${t("filters.home")})`;
  }
  return name;
}

export function gameStatusLabel(status: string, t: TFn): string {
  const key = `gameStatus.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function assignmentStatusLabel(status: AssignmentStatus, t: TFn, compact?: boolean): string {
  const prefix = compact ? "assignmentStatus.short." : "assignmentStatus.";
  const key = `${prefix}${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function gameCountLabel(count: number, t: TFn): string {
  const unit = count === 1 ? t("common.game") : t("common.gamesPlural");
  return t("adminSchedule.gameCount", { count, unit });
}
