import { serviceDb } from "../db";
import { isResendConfigured } from "../env";
import { sendBulkEmail, type EmailRecipient } from "./email";
import type { AssignmentStatus, Position } from "../types";

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

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Email workspace ADMIN/ASSIGNOR members when an official accepts or declines. */
export async function notifyAssignorsOfAssignmentResponse(
  assignmentId: string,
  newStatus: "CONFIRMED" | "REJECTED"
): Promise<void> {
  if (!isResendConfigured()) return;

  const db = serviceDb();

  const { data: rowRaw, error } = await db
    .from("assignments")
    .select(
      "position, status, official:profiles(full_name, email), " +
        "game:games(id, home_team, away_team, date_time, workspace_id, venue:venues(name))"
    )
    .eq("id", assignmentId)
    .maybeSingle();
  if (error || !rowRaw) return;

  const row = rowRaw as Record<string, unknown>;

  const game = unwrapOne(
    row.game as
      | {
          home_team: string | null;
          away_team: string | null;
          date_time: string;
          workspace_id: string;
          venue: { name: string } | { name: string }[] | null;
        }
      | null
  );
  if (!game?.workspace_id) return;

  const official = unwrapOne(
    row.official as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null
  );
  const officialName = official?.full_name?.trim() || official?.email || "An official";
  const venue = unwrapOne(game.venue);
  const position = row.position as Position;
  const positionLabel = POSITION_LABELS[position] ?? position;
  const when = formatGameWhen(game.date_time);
  const matchup = `${game.home_team ?? "TBD"} vs ${game.away_team ?? "TBD"}`;
  const rink = venue?.name ? ` at ${venue.name}` : "";
  const action =
    newStatus === "CONFIRMED" ? "accepted" : "declined";

  const { data: members, error: memErr } = await db
    .from("workspace_members")
    .select("profile:profiles(email, full_name)")
    .eq("workspace_id", game.workspace_id)
    .in("role", ["ADMIN", "ASSIGNOR"]);
  if (memErr) return;

  const seen = new Set<string>();
  const recipients: EmailRecipient[] = [];
  for (const m of members ?? []) {
    const member = m as Record<string, unknown>;
    const profile = unwrapOne(
      member.profile as
        | { email: string; full_name: string | null }
        | { email: string; full_name: string | null }[]
        | null
    );
    const email = profile?.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, full_name: profile?.full_name ?? null });
  }

  if (recipients.length === 0) return;

  const subject =
    newStatus === "CONFIRMED"
      ? `Assignment accepted: ${matchup}`
      : `Assignment declined: ${matchup}`;

  const body = [
    `${officialName} has ${action} their assignment.`,
    "",
    `Position: ${positionLabel}`,
    `Game: ${matchup}${rink}`,
    `When: ${when}`,
    "",
    "Open WhistleOps Assignment Board or Schedule to review crew status for this day.",
  ].join("\n");

  await sendBulkEmail(recipients, subject, body);
}

export function shouldNotifyAssignors(
  previousStatus: AssignmentStatus,
  newStatus: AssignmentStatus | undefined
): newStatus is "CONFIRMED" | "REJECTED" {
  if (newStatus !== "CONFIRMED" && newStatus !== "REJECTED") return false;
  return previousStatus === "PENDING";
}
