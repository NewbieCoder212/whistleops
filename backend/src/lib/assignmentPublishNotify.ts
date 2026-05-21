import { serviceDb } from "../db";
import { isResendConfigured } from "../env";
import { sendBulkEmail, type EmailRecipient } from "./email";
import type { Position } from "../types";

const POSITION_LABELS: Record<Position, string> = {
  REF1: "Referee 1",
  REF2: "Referee 2",
  LINE1: "Linesman 1",
  LINE2: "Linesman 2",
  SUPERVISOR: "Supervisor",
};

function formatGameWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-CA", {
      timeZone: "America/Moncton",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateLabel(date: string): string {
  try {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export type PublishedAssignmentRow = {
  id: string;
  official_id: string;
  position: Position;
  game: {
    home_team: string | null;
    away_team: string | null;
    date_time: string;
    venue: { name: string } | null;
  };
  official: {
    email: string;
    full_name: string | null;
  };
};

/** One email per official listing all assignments published in this batch. */
export async function notifyOfficialsOfPublishedAssignments(
  rows: PublishedAssignmentRow[],
  date: string,
  zoneName: string
): Promise<{ sent: string[]; failed: Array<{ email: string; error: string }> }> {
  if (!isResendConfigured() || rows.length === 0) {
    return { sent: [], failed: [] };
  }

  const byOfficial = new Map<
    string,
    { recipient: EmailRecipient; lines: string[] }
  >();

  for (const row of rows) {
    const email = row.official.email?.trim();
    if (!email) continue;

    const when = formatGameWhen(row.game.date_time);
    const matchup = `${row.game.home_team ?? "TBD"} vs ${row.game.away_team ?? "TBD"}`;
    const rink = row.game.venue?.name ? ` · ${row.game.venue.name}` : "";
    const positionLabel = POSITION_LABELS[row.position] ?? row.position;
    const line = `• ${when} — ${matchup}${rink} (${positionLabel})`;

    const existing = byOfficial.get(row.official_id);
    if (existing) {
      existing.lines.push(line);
      continue;
    }

    byOfficial.set(row.official_id, {
      recipient: { email, full_name: row.official.full_name },
      lines: [line],
    });
  }

  const dateLabel = formatDateLabel(date);
  const sent: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const { recipient, lines } of byOfficial.values()) {
    const name = recipient.full_name?.trim() || "Official";
    const count = lines.length;
    const subject =
      count === 1
        ? `New assignment — ${dateLabel}`
        : `${count} new assignments — ${dateLabel}`;

    const body = [
      `Hi ${name},`,
      "",
      `You have ${count === 1 ? "a new assignment" : `${count} new assignments`} for ${dateLabel} (${zoneName}). Please sign in to WhistleOps and accept or decline each one on My Schedule.`,
      "",
      ...lines,
      "",
      "Thank you,",
      "WhistleOps",
    ].join("\n");

    const { sent: batchSent, failed: batchFailed } = await sendBulkEmail(
      [recipient],
      subject,
      body
    );
    sent.push(...batchSent);
    failed.push(...batchFailed);
  }

  return { sent, failed };
}

/** Load published rows with official + game details for email bodies. */
export async function loadPublishedAssignmentRows(
  assignmentIds: string[]
): Promise<PublishedAssignmentRow[]> {
  if (assignmentIds.length === 0) return [];

  const { data, error } = await serviceDb()
    .from("assignments")
    .select(
      "id, official_id, position, " +
        "official:profiles(email, full_name), " +
        "game:games(home_team, away_team, date_time, venue:venues(name))"
    )
    .in("id", assignmentIds);

  if (error || !data) return [];

  type VenueSnap = { name: string } | { name: string }[] | null;
  type GameSnap = {
    home_team: string | null;
    away_team: string | null;
    date_time: string;
    venue: VenueSnap;
  };

  function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
    if (value == null) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
  }

  const rows: PublishedAssignmentRow[] = [];

  for (const raw of data) {
    const r = raw as unknown as Record<string, unknown>;
    const official = unwrapOne(
      r.official as { email: string; full_name: string | null } | null
    );
    const gameRaw = unwrapOne(r.game as GameSnap | null);
    if (!official?.email?.trim() || !gameRaw) continue;

    const venue = unwrapOne(gameRaw.venue);

    rows.push({
      id: r.id as string,
      official_id: r.official_id as string,
      position: r.position as Position,
      official: {
        email: official.email,
        full_name: official.full_name,
      },
      game: {
        home_team: gameRaw.home_team,
        away_team: gameRaw.away_team,
        date_time: gameRaw.date_time,
        venue: venue ? { name: venue.name } : null,
      },
    });
  }

  return rows;
}
