import type { BulkGameRow } from "@shared/types";
import { normalizeLeagueType } from "./leagueType";

export interface ParsedRow extends BulkGameRow {
  _rowIndex: number;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface CsvParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
  rawHeaders: string[];
}

const COL_ALIASES: Record<keyof BulkGameRow, string[]> = {
  date: ["date", "game date", "game_date"],
  time: ["time", "game time", "game_time", "start time", "start_time"],
  venue_name: ["venue", "venue name", "venue_name", "rink", "location", "arena"],
  home_team: ["home", "home team", "home_team"],
  away_team: ["away", "away team", "away_team", "visiting team", "visitor"],
  league_tier: [
    "league",
    "league tier",
    "league_tier",
    "tier",
    "division",
    "league level",
    "league_level",
  ],
  league_type: ["league type", "league_type", "category", "class"],
  game_number: ["game number", "game_number", "game #", "game no", "game id", "game_id"],
};

function detectColumn(headers: string[], field: keyof BulkGameRow): number {
  const aliases = COL_ALIASES[field];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.toLowerCase().trim();
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

function normalizeTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h!.padStart(2, "0")}:${m}`;
  }
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let hours = parseInt(ampm[1]!, 10);
    const mins = ampm[2]!;
    const period = ampm[3]!.toLowerCase();
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }
  return null;
}

function parseGameNumber(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/^#/, "");
  if (!trimmed) return undefined;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: "File is empty or has no data rows." }], rawHeaders: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]!);
  const colMap = {
    date: detectColumn(rawHeaders, "date"),
    time: detectColumn(rawHeaders, "time"),
    venue_name: detectColumn(rawHeaders, "venue_name"),
    home_team: detectColumn(rawHeaders, "home_team"),
    away_team: detectColumn(rawHeaders, "away_team"),
    league_tier: detectColumn(rawHeaders, "league_tier"),
    league_type: detectColumn(rawHeaders, "league_type"),
    game_number: detectColumn(rawHeaders, "game_number"),
  };

  const missing = Object.entries(colMap)
    .filter(([k, v]) => v === -1 && !["league_tier", "league_type", "game_number"].includes(k))
    .map(([k]) => k);

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Required columns not found: ${missing.join(", ")}. Headers detected: ${rawHeaders.join(", ")}` }],
      rawHeaders,
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rowNum = i;

    const rawDate = cells[colMap.date] ?? "";
    const rawTime = cells[colMap.time] ?? "";
    const venueName = (cells[colMap.venue_name] ?? "").trim();
    const homeTeam = (cells[colMap.home_team] ?? "").trim();
    const awayTeam = (cells[colMap.away_team] ?? "").trim();
    const leagueTier = colMap.league_tier !== -1 ? (cells[colMap.league_tier] ?? "").trim() : "";
    const rawLeagueType = colMap.league_type !== -1 ? (cells[colMap.league_type] ?? "").trim() : "";
    const leagueType = normalizeLeagueType(rawLeagueType) ?? undefined;
    const rawGameNum = colMap.game_number !== -1 ? (cells[colMap.game_number] ?? "").trim() : "";
    const gameNumber = parseGameNumber(rawGameNum);

    const date = normalizeDate(rawDate);
    const time = normalizeTime(rawTime);

    const rowErrors: string[] = [];
    if (!date) rowErrors.push(`Invalid date "${rawDate.trim()}" — use YYYY-MM-DD or MM/DD/YYYY`);
    if (!time) rowErrors.push(`Invalid time "${rawTime.trim()}" — use HH:MM or H:MM AM/PM`);
    if (!venueName) rowErrors.push("Venue/Rink is empty");
    if (!homeTeam) rowErrors.push("Home Team is empty");
    if (!awayTeam) rowErrors.push("Away Team is empty");
    if (rawLeagueType && !leagueType) {
      rowErrors.push(`Unrecognized league type "${rawLeagueType}" — use Minor, Senior, or Adult Rec`);
    }

    const baseRow: ParsedRow = {
      _rowIndex: rowNum,
      date: date ?? rawDate.trim(),
      time: time ?? rawTime.trim(),
      venue_name: venueName,
      home_team: homeTeam,
      away_team: awayTeam,
      league_tier: leagueTier,
      ...(leagueType ? { league_type: leagueType } : {}),
      ...(gameNumber !== undefined ? { game_number: gameNumber } : {}),
    };

    if (rowErrors.length > 0) {
      for (const msg of rowErrors) errors.push({ row: rowNum, message: msg });
      rows.push(baseRow);
    } else {
      rows.push({
        ...baseRow,
        date: date!,
        time: time!,
      });
    }
  }

  return { rows, errors, rawHeaders };
}
