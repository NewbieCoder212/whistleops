import { WORKSPACE_TIMEZONE } from "./availabilityMatch";
import { parsePositionLabels } from "./positionLabels";
import type { Position, PositionLabelsConfig } from "../types";

/** Default hockey game block when no end time is stored. */
export const GAME_DURATION_MS = 2.5 * 60 * 60 * 1000;

export type CalendarGameVenue = {
  name: string | null;
  address: string | null;
  timezone: string | null;
};

export type CalendarGame = {
  id: string;
  date_time: string;
  home_team: string | null;
  away_team: string | null;
  league_tier: string | null;
  league_type: string | null;
  game_number: number | null;
  notes: string | null;
  status: string;
  venue: CalendarGameVenue | null;
};

export type CalendarAssignment = {
  id: string;
  position: string;
  status: string;
  updated_at: string;
  game: CalendarGame | null;
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const crlf = "\r\n";
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let idx = 75;
  while (idx < line.length) {
    parts.push(" " + line.slice(idx, idx + 74));
    idx += 74;
  }
  return parts.join(crlf);
}

function formatIcsUtc(instant: Date): string {
  const y = instant.getUTCFullYear();
  const mo = String(instant.getUTCMonth() + 1).padStart(2, "0");
  const d = String(instant.getUTCDate()).padStart(2, "0");
  const h = String(instant.getUTCHours()).padStart(2, "0");
  const mi = String(instant.getUTCMinutes()).padStart(2, "0");
  const s = String(instant.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function formatIcsLocal(instant: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

function venueTimezone(venue: CalendarGameVenue | null): string {
  const tz = venue?.timezone?.trim();
  return tz && tz.length > 0 ? tz : WORKSPACE_TIMEZONE;
}

function positionLabel(position: string, labels: PositionLabelsConfig): string {
  const key = position as Position;
  return labels[key]?.label ?? position;
}

function buildDescription(game: CalendarGame): string {
  const lines: string[] = [];
  if (game.league_type) lines.push(`League: ${game.league_type}`);
  if (game.league_tier) lines.push(`Tier: ${game.league_tier}`);
  if (game.game_number != null) lines.push(`Game #: ${game.game_number}`);
  if (game.notes?.trim()) lines.push(game.notes.trim());
  lines.push("Managed in WhistleOps");
  return lines.join("\\n");
}

function buildLocation(venue: CalendarGameVenue | null): string {
  if (!venue) return "";
  const name = venue.name?.trim() ?? "";
  const address = venue.address?.trim() ?? "";
  if (name && address) return `${name}, ${address}`;
  return name || address;
}

function buildEvent(
  assignment: CalendarAssignment,
  labels: PositionLabelsConfig,
  now: Date
): string | null {
  const game = assignment.game;
  if (!game?.date_time) return null;

  const start = new Date(game.date_time);
  if (Number.isNaN(start.getTime())) return null;

  const tz = venueTimezone(game.venue);
  const end = new Date(start.getTime() + GAME_DURATION_MS);
  const home = game.home_team?.trim() || "TBD";
  const away = game.away_team?.trim() || "TBD";
  const summary = `${positionLabel(assignment.position, labels)} — ${home} vs ${away}`;
  const location = buildLocation(game.venue);
  const description = buildDescription(game);
  const updated = new Date(assignment.updated_at);
  const dtStamp = formatIcsUtc(Number.isNaN(updated.getTime()) ? now : updated);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${assignment.id}@whistleops`,
    `DTSTAMP:${dtStamp}`,
    `LAST-MODIFIED:${dtStamp}`,
    `DTSTART;TZID=${tz}:${formatIcsLocal(start, tz)}`,
    `DTEND;TZID=${tz}:${formatIcsLocal(end, tz)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    "STATUS:CONFIRMED",
  ];

  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);

  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function buildIcsCalendar(
  assignments: CalendarAssignment[],
  positionLabelsRaw: unknown,
  calendarName = "WhistleOps Schedule"
): string {
  const labels = parsePositionLabels(positionLabelsRaw);
  const now = new Date();
  const events = assignments
    .map((a) => buildEvent(a, labels, now))
    .filter((e): e is string => e != null);

  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WhistleOps//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ].map(foldLine);

  const footer = ["END:VCALENDAR"].map(foldLine);
  return [...header, ...events, ...footer].join("\r\n") + "\r\n";
}
