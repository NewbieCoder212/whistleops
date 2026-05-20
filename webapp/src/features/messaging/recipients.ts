import type { ScheduleAssignment, ScheduleGame } from "@/features/schedule/scheduleTypes";

export type MessageRecipient = {
  id: string;
  name: string;
  email: string;
};

const MESSAGEABLE_STATUSES = new Set(["PENDING", "CONFIRMED"]);

function isMessageableAssignment(a: ScheduleAssignment): boolean {
  return MESSAGEABLE_STATUSES.has(a.status) && !!a.official_id;
}

/** Officials who will receive a game message (matches backend message-assigned rules). */
export function collectMessageRecipients(game: ScheduleGame): {
  recipients: MessageRecipient[];
  count: number;
} {
  const seen = new Set<string>();
  const recipients: MessageRecipient[] = [];

  for (const assignment of game.assignments) {
    if (!isMessageableAssignment(assignment)) continue;

    const official = assignment.official;
    const officialId = assignment.official_id;
    if (seen.has(officialId)) continue;

    const email = official?.email?.trim();
    if (!email) continue;

    seen.add(officialId);
    recipients.push({
      id: officialId,
      name: official?.full_name?.trim() || email,
      email,
    });
  }

  recipients.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return { recipients, count: recipients.length };
}
