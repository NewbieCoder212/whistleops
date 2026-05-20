/**
 * Gamesheet webhook payload normalization and game matching.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameStatus, GamesheetWebhookPayload } from "../types";

export type ExtractedGamesheetEvent = {
  externalId: string | null;
  eventType: string | null;
  homeScore?: number;
  awayScore?: number;
  externalStatus: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  gameNumber: number | null;
  scheduledAt: string | null;
};

function coerceId(v: string | number | undefined): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function pickScore(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Math.trunc(Number(v));
  }
  return undefined;
}

function normalizeTeam(s: string | undefined): string | null {
  if (!s?.trim()) return null;
  return s.trim().toLowerCase();
}

function teamsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Flatten nested game/data objects into a single extracted event. */
export function extractGamesheetEvent(raw: GamesheetWebhookPayload): ExtractedGamesheetEvent {
  const nested = raw.game ?? raw.data;
  const externalId =
    coerceId(raw.external_id) ??
    coerceId(raw.game_id) ??
    coerceId(raw.id) ??
    coerceId(nested?.external_id) ??
    coerceId(nested?.game_id) ??
    coerceId(nested?.id);

  const eventType = raw.event ?? raw.type ?? null;
  const externalStatus = raw.status ?? nested?.status ?? null;

  return {
    externalId,
    eventType,
    homeScore: pickScore(raw.home_score ?? nested?.home_score),
    awayScore: pickScore(raw.away_score ?? nested?.away_score),
    externalStatus: externalStatus?.trim() ? externalStatus.trim() : null,
    homeTeam: normalizeTeam(raw.home_team ?? nested?.home_team),
    awayTeam: normalizeTeam(raw.away_team ?? nested?.away_team),
    gameNumber:
      typeof raw.game_number === "number"
        ? raw.game_number
        : typeof nested?.game_number === "number"
          ? nested.game_number
          : null,
    scheduledAt: raw.scheduled_at ?? raw.date_time ?? nested?.scheduled_at ?? nested?.date_time ?? null,
  };
}

/** Map Gamesheet status strings to WhistleOps game status; null = no change. */
export function mapExternalStatusToGameStatus(
  externalStatus: string | null
): GameStatus | null {
  if (!externalStatus) return null;
  const s = externalStatus.toLowerCase().replace(/[\s-]+/g, "_");

  if (
    s.includes("final") ||
    s.includes("complete") ||
    s === "ended" ||
    s === "finished" ||
    s === "over"
  ) {
    return "COMPLETED";
  }
  if (
    s.includes("cancel") ||
    s.includes("postpone") ||
    s.includes("forfeit") ||
    s === "abandoned"
  ) {
    return "CANCELLED";
  }
  // scheduled / in_progress / live — do not change assignment scheduling status
  return null;
}

function windowAround(iso: string): { start: string; end: string } | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = 12 * 60 * 60 * 1000;
  return {
    start: new Date(t - ms).toISOString(),
    end: new Date(t + ms).toISOString(),
  };
}

export async function findGameForEvent(
  db: SupabaseClient,
  extracted: ExtractedGamesheetEvent
): Promise<{ id: string; status: string; gamesheet_external_id: string | null } | null> {
  if (extracted.externalId) {
    const { data } = await db
      .from("games")
      .select("id, status, gamesheet_external_id")
      .eq("gamesheet_external_id", extracted.externalId)
      .maybeSingle();
    if (data) return data;
  }

  if (extracted.gameNumber == null) return null;

  let q = db
    .from("games")
    .select("id, status, gamesheet_external_id, home_team, away_team, date_time")
    .eq("game_number", extracted.gameNumber);

  if (extracted.scheduledAt) {
    const w = windowAround(extracted.scheduledAt);
    if (w) {
      q = q.gte("date_time", w.start).lte("date_time", w.end);
    }
  }

  const { data: candidates, error } = await q.limit(20);
  if (error || !candidates?.length) return null;

  const withTeams = candidates.filter((g) => {
    const home = normalizeTeam(g.home_team ?? undefined);
    const away = normalizeTeam(g.away_team ?? undefined);
    if (!extracted.homeTeam && !extracted.awayTeam) return true;
    const homeOk = extracted.homeTeam ? teamsMatch(home, extracted.homeTeam) : true;
    const awayOk = extracted.awayTeam ? teamsMatch(away, extracted.awayTeam) : true;
    return homeOk && awayOk;
  });

  const pick = withTeams[0] ?? candidates[0];
  if (!pick) return null;
  return {
    id: pick.id,
    status: pick.status,
    gamesheet_external_id: pick.gamesheet_external_id,
  };
}

export async function applyGamesheetUpdate(
  db: SupabaseClient,
  gameId: string,
  current: { status: string; gamesheet_external_id: string | null },
  extracted: ExtractedGamesheetEvent
): Promise<void> {
  const patch: Record<string, unknown> = {
    gamesheet_synced_at: new Date().toISOString(),
  };

  if (extracted.externalStatus) {
    patch.gamesheet_status = extracted.externalStatus;
  }
  if (extracted.homeScore !== undefined) patch.home_score = extracted.homeScore;
  if (extracted.awayScore !== undefined) patch.away_score = extracted.awayScore;

  const mapped = mapExternalStatusToGameStatus(extracted.externalStatus);
  if (mapped) patch.status = mapped;

  if (extracted.externalId && !current.gamesheet_external_id) {
    patch.gamesheet_external_id = extracted.externalId;
  }

  const { error } = await db.from("games").update(patch).eq("id", gameId);
  if (error) throw new Error(error.message);
}
