import type { LeagueType } from "@shared/types";

const LEAGUE_TYPE_ALIASES: Record<string, LeagueType> = {
  minor: "Minor",
  "minor hockey": "Minor",
  youth: "Minor",
  junior: "Minor",
  senior: "Senior",
  "senior hockey": "Senior",
  "adult rec": "Adult Rec",
  "adult recreational": "Adult Rec",
  recreational: "Adult Rec",
  rec: "Adult Rec",
  adult: "Adult Rec",
};

const EXACT: LeagueType[] = ["Minor", "Senior", "Adult Rec"];

/** Map external CSV labels to provincial league_type enum. */
export function normalizeLeagueType(raw: string | null | undefined): LeagueType | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  if ((EXACT as string[]).includes(trimmed)) return trimmed as LeagueType;

  const key = trimmed.toLowerCase();
  if (LEAGUE_TYPE_ALIASES[key]) return LEAGUE_TYPE_ALIASES[key];

  if (key.includes("minor") || key.includes("youth") || key.includes("midget") || key.includes("bantam")) {
    return "Minor";
  }
  if (key.includes("senior")) return "Senior";
  if (key.includes("rec") || key.includes("adult")) return "Adult Rec";

  return null;
}
