import type {
  CertificationLevel,
  LeagueQualificationWithLevel,
  Profile,
} from "@shared/types";

export type LeagueKeySource = "league_tier" | "league_type" | null;

export type ResolvedQualificationRule = {
  leagueKey: string;
  source: LeagueKeySource;
  minimumLevel: CertificationLevel;
  qualification: LeagueQualificationWithLevel;
};

export type OfficialQualificationResult = {
  qualified: boolean;
  reason?: string;
  officialLevelName?: string;
  officialSortOrder?: number;
};

/** Normalize league names for case-insensitive matching against league_qualifications.league_name. */
export function normalizeLeagueKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Prefer Goalline-style league_tier, then provincial league_type. */
export function resolveLeagueKeys(game: {
  league_tier?: string | null;
  league_type?: string | null;
}): Array<{ key: string; source: LeagueKeySource }> {
  const keys: Array<{ key: string; source: LeagueKeySource }> = [];
  const tier = normalizeLeagueKey(game.league_tier);
  const type = normalizeLeagueKey(game.league_type);
  if (tier) keys.push({ key: tier, source: "league_tier" });
  if (type && type !== tier) keys.push({ key: type, source: "league_type" });
  return keys;
}

export function findQualification(
  leagueKey: string,
  qualifications: LeagueQualificationWithLevel[]
): LeagueQualificationWithLevel | null {
  const normalized = leagueKey.trim().toLowerCase();
  return (
    qualifications.find((q) => q.league_name.trim().toLowerCase() === normalized) ?? null
  );
}

/** Resolve the first matching qualification rule for this game (tier, then type). */
export function resolveQualificationRule(
  game: { league_tier?: string | null; league_type?: string | null },
  qualifications: LeagueQualificationWithLevel[]
): ResolvedQualificationRule | null {
  for (const { key, source } of resolveLeagueKeys(game)) {
    const qualification = findQualification(key, qualifications);
    const minimumLevel = qualification?.minimum_level;
    if (qualification && minimumLevel) {
      return { leagueKey: key, source, minimumLevel, qualification };
    }
  }
  return null;
}

export function buildLevelsById(levels: CertificationLevel[]): Map<string, CertificationLevel> {
  return new Map(levels.map((l) => [l.id, l]));
}

export function getOfficialLevel(
  profile: Profile,
  levelsById: Map<string, CertificationLevel>
): CertificationLevel | null {
  if (!profile.official_level_id) return null;
  return levelsById.get(profile.official_level_id) ?? null;
}

export function checkOfficialQualified(
  profile: Profile,
  minSortOrder: number,
  levelsById: Map<string, CertificationLevel>,
  minLevelName: string,
  leagueLabel: string
): OfficialQualificationResult {
  const officialLevel = getOfficialLevel(profile, levelsById);

  if (!officialLevel) {
    return {
      qualified: false,
      reason: `No certification level set (requires ${minLevelName} for ${leagueLabel})`,
    };
  }

  if (officialLevel.sort_order < minSortOrder) {
    return {
      qualified: false,
      reason: `${officialLevel.name} — requires ${minLevelName}`,
      officialLevelName: officialLevel.name,
      officialSortOrder: officialLevel.sort_order,
    };
  }

  return {
    qualified: true,
    officialLevelName: officialLevel.name,
    officialSortOrder: officialLevel.sort_order,
  };
}
