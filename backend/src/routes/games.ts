import { Hono } from "hono";
import { serviceDb } from "../db";
import { isResendConfigured } from "../env";
import { sendBulkEmail } from "../lib/email";
import { dbError, runRoute } from "../lib/handleDb";
import { normalizeLeagueType } from "../lib/payCalculation";
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import {
  GameCreateSchema,
  GameUpdateSchema,
  BulkImportPayloadSchema,
  GameMessageAssignedSchema,
  type BulkImportResult,
} from "../types";

const gamesRouter = new Hono();

gamesRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const status = c.req.query("status");

    let q = serviceDb()
      .from("games")
      .select("*, venue:venues(*), assignments(*, official:profiles(id, full_name, official_type, email))")
      .order("date_time", { ascending: true });
    if (startDate) q = q.gte("date_time", startDate);
    if (endDate) q = q.lte("date_time", endDate);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

gamesRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("games")
      .select("*, venue:venues(*), assignments(*, official:profiles(id, full_name, official_type, email))")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data)
      return c.json({ error: { message: "Game not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

gamesRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, GameCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("games")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

// ── POST /api/games/bulk ──────────────────────────────────────────────────────
// Accepts parsed game rows from the frontend CSV preview.
// Resolves venue names → venue UUIDs (auto-creates unknown venues).
// Bulk-inserts valid rows; collects per-row validation errors.
gamesRouter.post("/bulk", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, BulkImportPayloadSchema);
    if (body instanceof Response) return body;

    const db = serviceDb();
    const result: BulkImportResult = { inserted: 0, skipped: 0, errors: [] };

    // Pre-load existing venues to minimise round-trips
    const { data: existingVenues } = await db.from("venues").select("id, name, assignable");
    const venueCache = new Map<string, { id: string; assignable: boolean }>(
      (existingVenues ?? []).map((v) => [
        v.name.toLowerCase().trim(),
        { id: v.id, assignable: v.assignable !== false },
      ])
    );

    // Resolve or create a venue by name (non-assignable existing venues are rejected)
    const resolveVenue = async (
      rawName: string
    ): Promise<{ id: string } | { error: string }> => {
      const key = rawName.toLowerCase().trim();
      if (venueCache.has(key)) {
        const v = venueCache.get(key)!;
        if (!v.assignable) {
          return { error: `Venue "${rawName}" is not assignable — enable it in Configuration → Rinks` };
        }
        return { id: v.id };
      }
      const { data, error } = await db
        .from("venues")
        .insert({
          name: rawName.trim(),
          timezone: "America/Halifax", // default — admin can update later
        })
        .select("id")
        .single();
      if (error || !data) return { error: error?.message ?? "Could not create venue" };
      venueCache.set(key, { id: data.id, assignable: true });
      return { id: data.id };
    };

    // Validate a single row, returns ISO timestamp or null
    const parseDateTime = (
      date: string,
      time: string
    ): { iso: string } | { error: string } => {
      // Accept: YYYY-MM-DD
      const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateParts)
        return { error: `Invalid date "${date}" — expected YYYY-MM-DD` };
      const timeParts = time.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeParts)
        return { error: `Invalid time "${time}" — expected HH:MM` };
      const isoStr = `${date}T${time.padStart(5, "0")}:00.000Z`;
      if (isNaN(Date.parse(isoStr)))
        return { error: `Cannot parse date+time: "${date} ${time}"` };
      return { iso: isoStr };
    };

    // Build validated inserts
    const inserts: Array<{
      date_time: string;
      venue_id: string | null;
      home_team: string;
      away_team: string;
      league_tier: string;
      league_type?: string | null;
      game_number?: number | null;
      status: string;
    }> = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]!;
      const rowNum = i + 1;
      const rowErrors: string[] = [];

      if (!row.home_team?.trim())
        rowErrors.push("home_team is empty");
      if (!row.away_team?.trim())
        rowErrors.push("away_team is empty");
      if (!row.venue_name?.trim())
        rowErrors.push("venue is empty");

      const dt = parseDateTime(row.date, row.time);
      if ("error" in dt) rowErrors.push(dt.error);

      if (rowErrors.length > 0) {
        for (const msg of rowErrors) {
          result.errors.push({ row: rowNum, field: "—", message: msg });
        }
        result.skipped++;
        continue;
      }

      const venueResult = await resolveVenue(row.venue_name);
      if ("error" in venueResult) {
        result.errors.push({ row: rowNum, field: "venue", message: venueResult.error });
        result.skipped++;
        continue;
      }
      const venueId = venueResult.id;
      const leagueType =
        row.league_type ?? normalizeLeagueType(row.league_tier) ?? null;

      inserts.push({
        date_time: (dt as { iso: string }).iso,
        venue_id: venueId,
        home_team: row.home_team.trim(),
        away_team: row.away_team.trim(),
        league_tier: row.league_tier?.trim() ?? "",
        ...(leagueType ? { league_type: leagueType } : {}),
        ...(row.game_number != null ? { game_number: row.game_number } : {}),
        status: "UNASSIGNED",
      });
    }

    // Bulk insert in chunks of 100 to stay within Supabase payload limits
    const CHUNK = 100;
    for (let start = 0; start < inserts.length; start += CHUNK) {
      const chunk = inserts.slice(start, start + CHUNK);
      const { error } = await db.from("games").insert(chunk);
      if (error) {
        result.errors.push({
          row: start + 1,
          field: "batch",
          message: `Batch insert failed: ${error.message}`,
        });
        result.skipped += chunk.length;
      } else {
        result.inserted += chunk.length;
      }
    }

    return result;
  })
);

// ── POST /api/games/:id/message-assigned ──────────────────────────────────────
// Emails all PENDING/CONFIRMED officials assigned to this game.
gamesRouter.post("/:id/message-assigned", requireAdmin, async (c) =>
  runRoute(c, async () => {
    if (!isResendConfigured()) {
      return c.json(
        {
          error: {
            message: "Email is not configured. Add RESEND_API_KEY in environment settings.",
            code: "RESEND_NOT_CONFIGURED",
          },
        },
        503
      );
    }

    const gameId = c.req.param("id");
    const body = await parseJson(c, GameMessageAssignedSchema);
    if (body instanceof Response) return body;

    const db = serviceDb();

    const { data: game, error: gameError } = await db
      .from("games")
      .select("id, home_team, away_team, date_time")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) return dbError(c, gameError);
    if (!game) {
      return c.json({ error: { message: "Game not found", code: "NOT_FOUND" } }, 404);
    }

    const { data: assignments, error: assignError } = await db
      .from("assignments")
      .select("official_id, official:profiles(email, full_name)")
      .eq("game_id", gameId)
      .in("status", ["CONFIRMED", "PENDING"]);
    if (assignError) return dbError(c, assignError);

    const seen = new Set<string>();
    const recipients: Array<{ email: string; full_name: string | null }> = [];

    for (const row of assignments ?? []) {
      const raw = row.official;
      const official = Array.isArray(raw) ? raw[0] : raw;
      const email =
        official && typeof official === "object" && "email" in official
          ? String(official.email ?? "").trim()
          : "";
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const fullName =
        official && typeof official === "object" && "full_name" in official
          ? (official.full_name as string | null)
          : null;
      recipients.push({ email, full_name: fullName });
    }

    if (recipients.length === 0) {
      return c.json(
        {
          error: {
            message: "No officials are currently assigned to this game to message.",
            code: "NO_RECIPIENTS",
          },
        },
        400
      );
    }

    const { sent, failed } = await sendBulkEmail(recipients, body.subject, body.body);

    if (sent.length === 0) {
      return c.json(
        {
          error: {
            message: failed[0]?.error ?? "Failed to send emails.",
            code: "EMAIL_SEND_FAILED",
          },
        },
        502
      );
    }

    return {
      sent_count: sent.length,
      recipients: sent,
      ...(failed.length > 0 ? { failed } : {}),
    };
  })
);

gamesRouter.put("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, GameUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("games")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

gamesRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb().from("games").delete().eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { gamesRouter };
