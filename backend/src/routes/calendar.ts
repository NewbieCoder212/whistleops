import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { serviceDb } from "../db";
import { buildIcsCalendar, type CalendarAssignment } from "../lib/icsCalendar";
import { dbError } from "../lib/handleDb";
import { requireWorkspace } from "../middleware/auth";
import { DEFAULT_POSITION_LABELS } from "../lib/positionLabels";

const calendarRouter = new Hono();

const FEED_LOOKBACK_DAYS = 30;

function generateCalendarFeedToken(): string {
  return randomBytes(32).toString("hex");
}

function buildFeedUrls(origin: string, token: string) {
  const feedUrl = `${origin}/api/calendar/feed/${token}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  return { feedUrl, webcalUrl };
}

async function loadPositionLabels(workspaceId: string): Promise<unknown> {
  const { data } = await serviceDb()
    .from("settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "position_labels")
    .maybeSingle();
  return data?.value ?? DEFAULT_POSITION_LABELS;
}

async function getMembership(workspaceId: string, profileId: string) {
  const { data, error } = await serviceDb()
    .from("workspace_members")
    .select("id, calendar_feed_token")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureFeedToken(workspaceId: string, profileId: string): Promise<string | null> {
  const member = await getMembership(workspaceId, profileId);
  if (!member) return null;

  if (member.calendar_feed_token) return member.calendar_feed_token;

  const token = generateCalendarFeedToken();
  const { data, error } = await serviceDb()
    .from("workspace_members")
    .update({ calendar_feed_token: token })
    .eq("id", member.id)
    .select("calendar_feed_token")
    .single();
  if (error) throw error;
  return data.calendar_feed_token;
}

async function fetchConfirmedAssignments(
  workspaceId: string,
  profileId: string
): Promise<CalendarAssignment[]> {
  const cutoffMs = Date.now() - FEED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const { data, error } = await serviceDb()
    .from("assignments")
    .select(
      "id, position, status, updated_at, game:games(id, date_time, home_team, away_team, league_tier, league_type, game_number, notes, status, venue:venues(name, address, timezone))"
    )
    .eq("official_id", profileId)
    .eq("status", "CONFIRMED")
    .eq("game.workspace_id", workspaceId);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => {
      const game = row.game as CalendarAssignment["game"];
      if (!game || game.status === "CANCELLED") return false;
      const start = new Date(game.date_time).getTime();
      return !Number.isNaN(start) && start >= cutoffMs;
    })
    .sort((a, b) => {
      const aTime = new Date((a.game as CalendarAssignment["game"])!.date_time).getTime();
      const bTime = new Date((b.game as CalendarAssignment["game"])!.date_time).getTime();
      return aTime - bTime;
    }) as CalendarAssignment[];
}

// ── GET /api/calendar/feed-url ────────────────────────────────────────────────
calendarRouter.get("/feed-url", requireWorkspace, async (c) => {
  try {
    const workspaceId = c.get("workspaceId");
    const profileId = c.get("profileId")!;

    const token = await ensureFeedToken(workspaceId, profileId);
    if (!token) {
      return c.json(
        { error: { message: "Not a member of this workspace", code: "FORBIDDEN" } },
        403
      );
    }

    const origin = new URL(c.req.url).origin;
    return c.json({ data: buildFeedUrls(origin, token) });
  } catch (e) {
    return dbError(c, e);
  }
});

// ── POST /api/calendar/regenerate-token ─────────────────────────────────────────
calendarRouter.post("/regenerate-token", requireWorkspace, async (c) => {
  try {
    const workspaceId = c.get("workspaceId");
    const profileId = c.get("profileId")!;

    const member = await getMembership(workspaceId, profileId);
    if (!member) {
      return c.json(
        { error: { message: "Not a member of this workspace", code: "FORBIDDEN" } },
        403
      );
    }

    const token = generateCalendarFeedToken();
    const { error } = await serviceDb()
      .from("workspace_members")
      .update({ calendar_feed_token: token })
      .eq("id", member.id);
    if (error) return dbError(c, error);

    const origin = new URL(c.req.url).origin;
    return c.json({ data: buildFeedUrls(origin, token) });
  } catch (e) {
    return dbError(c, e);
  }
});

// ── GET /api/calendar/feed/:token ───────────────────────────────────────────────
calendarRouter.get("/feed/:token", async (c) => {
  try {
    const token = c.req.param("token")?.trim();
    if (!token) {
      return c.json({ error: { message: "Missing feed token", code: "BAD_REQUEST" } }, 400);
    }

    const { data: member, error: memberError } = await serviceDb()
      .from("workspace_members")
      .select("workspace_id, profile_id")
      .eq("calendar_feed_token", token)
      .maybeSingle();
    if (memberError) return dbError(c, memberError);
    if (!member) {
      return c.json({ error: { message: "Invalid feed token", code: "NOT_FOUND" } }, 404);
    }

    const assignments = await fetchConfirmedAssignments(
      member.workspace_id,
      member.profile_id
    );
    const positionLabels = await loadPositionLabels(member.workspace_id);
    const body = buildIcsCalendar(assignments, positionLabels);

    return c.body(body, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="whistleops-schedule.ics"',
      "Cache-Control": "no-cache",
    });
  } catch (e) {
    return dbError(c, e);
  }
});

export { calendarRouter };
