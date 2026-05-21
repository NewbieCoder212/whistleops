import type { Profile } from "../types";

type LevelRow = { id: string; name: string; sort_order: number };
type QualRow = {
  league_name: string;
  minimum_level: LevelRow | null;
};

export function resolveQualificationForGame(
  game: { league_tier?: string | null; league_type?: string | null },
  qualifications: QualRow[]
): { leagueKey: string; minSort: number; minName: string } | null {
  const keys: string[] = [];
  const tier = game.league_tier?.trim();
  const type = game.league_type?.trim();
  if (tier) keys.push(tier);
  if (type && type !== tier) keys.push(type);
  for (const key of keys) {
    const normalized = key.toLowerCase();
    const q = qualifications.find(
      (row) => row.league_name.trim().toLowerCase() === normalized && row.minimum_level
    );
    if (q?.minimum_level) {
      return {
        leagueKey: key,
        minSort: q.minimum_level.sort_order,
        minName: q.minimum_level.name,
      };
    }
  }
  return null;
}

export function isOfficialQualified(
  profile: Pick<Profile, "official_level_id">,
  rule: { minSort: number; minName: string; leagueKey: string } | null,
  levelsById: Map<string, LevelRow>
): boolean {
  if (!rule) return true;
  if (!profile.official_level_id) return false;
  const level = levelsById.get(profile.official_level_id);
  if (!level) return false;
  return level.sort_order >= rule.minSort;
}
