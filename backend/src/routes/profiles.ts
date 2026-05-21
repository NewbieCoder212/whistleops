import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { inviteOfficialByEmail } from "../lib/inviteOfficial";
import { parseJson } from "../lib/validate";
import { isGameInSeason, resolveStatsDateBounds } from "../lib/payCalculation";
import { DEFAULT_WORKSPACE_ID } from "../lib/workspace";
import { requireAuth, requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import {
  BulkOfficialImportPayloadSchema,
  type BulkOfficialImportResult,
  OfficialTypeEnum,
  ProfileCreateSchema,
  ProfileUpdateSchema,
  RoleEnum,
} from "../types";
const profilesRouter = new Hono();

profilesRouter.get("/", requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
    const { data: members, error: memErr } = await serviceDb()
      .from("workspace_members")
      .select("profile_id")
      .eq("workspace_id", workspaceId);
    if (memErr) return dbError(c, memErr);
    const ids = (members ?? []).map((m) => m.profile_id);
    if (ids.length === 0) return [];

    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .in("id", ids)
      .order("full_name", { ascending: true });
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

profilesRouter.get("/me", requireAuth, async (c) =>
  runRoute(c, async () => {
    const userId = c.get("userId");
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

// ── POST /api/profiles/bulk ───────────────────────────────────────────────────
profilesRouter.post("/bulk", requireWorkspaceHeader, requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, BulkOfficialImportPayloadSchema);
    if (body instanceof Response) return body;

    const workspaceId = c.get("workspaceId");
    const db = serviceDb();
    const result: BulkOfficialImportResult = {
      inserted: 0,
      skipped: 0,
      invited: 0,
      errors: [],
    };

    const { data: levels } = await db.from("certification_levels").select("id, name");
    const levelByName = new Map(
      (levels ?? []).map((l) => [l.name.toLowerCase().trim(), l.id])
    );

    const { data: zones } = await db.from("zones").select("id, name");
    const zoneByName = new Map(
      (zones ?? []).map((z) => [z.name.toLowerCase().trim(), z.id])
    );

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]!;
      const rowNum = i + 1;
      const rowErrors: string[] = [];

      if (!row.full_name?.trim()) rowErrors.push("full_name is empty");
      if (!row.email?.trim()) rowErrors.push("email is empty");

      const typeParsed = row.official_type
        ? OfficialTypeEnum.safeParse(row.official_type)
        : { success: true as const, data: undefined };
      if (!typeParsed.success) rowErrors.push(`Invalid official_type "${row.official_type}"`);

      const roleParsed = RoleEnum.safeParse(row.role ?? "OFFICIAL");
      if (!roleParsed.success) rowErrors.push(`Invalid role "${row.role}"`);

      if (rowErrors.length > 0) {
        for (const msg of rowErrors) {
          result.errors.push({ row: rowNum, field: "—", message: msg });
        }
        result.skipped++;
        continue;
      }

      let official_level_id: string | undefined;
      if (row.certification_level?.trim()) {
        const lid = levelByName.get(row.certification_level.toLowerCase().trim());
        if (!lid) {
          result.errors.push({
            row: rowNum,
            field: "certification_level",
            message: `Unknown level "${row.certification_level}"`,
          });
          result.skipped++;
          continue;
        }
        official_level_id = lid;
      }

      let zone_id: string | undefined;
      if (row.zone_name?.trim()) {
        const zid = zoneByName.get(row.zone_name.toLowerCase().trim());
        if (!zid) {
          result.errors.push({
            row: rowNum,
            field: "zone_name",
            message: `Unknown zone "${row.zone_name}"`,
          });
          result.skipped++;
          continue;
        }
        zone_id = zid;
      }

      let user_id: string | undefined;
      if (body.send_invites) {
        const inv = await inviteOfficialByEmail(row.email.trim(), {
          full_name: row.full_name.trim(),
        });
        if (inv.ok) {
          user_id = inv.userId;
          result.invited++;
        }
      }

      const { data: inserted, error } = await db
        .from("profiles")
        .insert({
          email: row.email.trim().toLowerCase(),
          full_name: row.full_name.trim(),
          cell_phone: row.cell_phone?.trim() || null,
          jersey_number: row.jersey_number?.trim() || null,
          role: roleParsed.data,
          official_type: typeParsed.data ?? null,
          official_level_id: official_level_id ?? null,
          zone_id: zone_id ?? null,
          distance_km: row.distance_km ?? null,
          user_id: user_id ?? null,
        })
        .select("id")
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          const { data: existing } = await db
            .from("profiles")
            .select("id")
            .eq("email", row.email.trim().toLowerCase())
            .maybeSingle();
          if (existing) {
            await db.from("workspace_members").upsert(
              {
                workspace_id: workspaceId,
                profile_id: existing.id,
                role: roleParsed.data,
              },
              { onConflict: "workspace_id,profile_id" }
            );
            result.inserted++;
            continue;
          }
        }
        result.errors.push({
          row: rowNum,
          field: "—",
          message: error.message.includes("duplicate")
            ? `Email already exists: ${row.email}`
            : error.message,
        });
        result.skipped++;
      } else if (inserted) {
        await db.from("workspace_members").insert({
          workspace_id: workspaceId,
          profile_id: inserted.id,
          role: roleParsed.data,
        });
        result.inserted++;
      }
    }

    return result;
  })
);

// ── GET /api/profiles/decline-stats ───────────────────────────────────────────
// REJECTED assignment counts per official for a season or custom date range.
profilesRouter.get("/decline-stats", requireWorkspaceHeader, requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
    const period = resolveStatsDateBounds({
      date_from: c.req.query("date_from"),
      date_to: c.req.query("date_to"),
      season_start: c.req.query("season_start"),
      season_end: c.req.query("season_end"),
      year: c.req.query("year"),
    });

    const { data: rows, error } = await serviceDb()
      .from("assignments")
      .select(
        "id, position, official_id, " +
          "game:games(id, date_time, home_team, away_team, league_tier, workspace_id, venue:venues(name))"
      )
      .eq("status", "REJECTED")
      .eq("game.workspace_id", workspaceId);

    if (error) return dbError(c, error);

    type GameSnap = {
      id: string;
      date_time: string;
      home_team: string | null;
      away_team: string | null;
      league_tier: string | null;
      workspace_id: string;
      venue: { name: string } | { name: string }[] | null;
    };

    const gamesByOfficial = new Map<
      string,
      Array<{
        assignment_id: string;
        game_id: string;
        position: string;
        date_time: string;
        home_team: string | null;
        away_team: string | null;
        venue_name: string | null;
        league_tier: string | null;
      }>
    >();

    for (const row of rows ?? []) {
      const rawGame = row.game as GameSnap | GameSnap[] | null;
      const game = Array.isArray(rawGame) ? rawGame[0] : rawGame;
      if (!game?.date_time || !isGameInSeason(game.date_time, period)) continue;

      const rawVenue = game.venue;
      const venue = Array.isArray(rawVenue) ? rawVenue[0] : rawVenue;
      const oid = row.official_id as string;
      const list = gamesByOfficial.get(oid) ?? [];
      list.push({
        assignment_id: row.id as string,
        game_id: game.id,
        position: row.position as string,
        date_time: game.date_time,
        home_team: game.home_team,
        away_team: game.away_team,
        venue_name: venue?.name ?? null,
        league_tier: game.league_tier,
      });
      gamesByOfficial.set(oid, list);
    }

    const by_official = Array.from(gamesByOfficial.entries())
      .map(([official_id, games]) => ({
        official_id,
        declined_count: games.length,
        games: games.sort((a, b) => a.date_time.localeCompare(b.date_time)),
      }))
      .sort((a, b) => b.declined_count - a.declined_count);

    const total_declined = by_official.reduce((n, r) => n + r.declined_count, 0);

    return {
      period,
      by_official,
      total_declined,
    };
  })
);

profilesRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("*")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

/** Postgres `date` columns reject ""; coerce blanks to null. */
function sanitizeProfileRow<T extends Record<string, unknown>>(body: T): T {
  const row = { ...body };
  const dateKeys = ["date_of_birth"] as const;
  for (const key of dateKeys) {
    if (key in row && row[key] === "") {
      (row as Record<string, unknown>)[key] = null;
    }
  }
  const optionalText = [
    "full_name",
    "jersey_number",
    "cell_phone",
    "home_address",
    "avatar_url",
  ] as const;
  for (const key of optionalText) {
    if (key in row && row[key] === "") {
      (row as Record<string, unknown>)[key] = null;
    }
  }
  return row;
}

profilesRouter.post("/", requireAuth, requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ProfileCreateSchema);
    if (body instanceof Response) return body;

    const workspaceId = c.get("workspaceId") ?? DEFAULT_WORKSPACE_ID;
    let user_id = body.user_id ?? c.get("userId");

    if (
      body.send_invite &&
      !body.user_id &&
      (body.role === "OFFICIAL" || body.role === "SUPERVISOR")
    ) {
      const inv = await inviteOfficialByEmail(body.email, {
        full_name: body.full_name,
      });
      if (!inv.ok) {
        return c.json(
          { error: { message: inv.message, code: "INVITE_FAILED" } },
          422
        );
      }
      user_id = inv.userId;
    }

    const { send_invite: _, ...row } = body;
    const { data, error } = await serviceDb()
      .from("profiles")
      .insert(sanitizeProfileRow({ ...row, user_id }))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    await serviceDb().from("workspace_members").upsert(
      {
        workspace_id: workspaceId,
        profile_id: data.id,
        role: data.role,
      },
      { onConflict: "workspace_id,profile_id" }
    );
    return data;
  })
);

profilesRouter.put("/:id", requireAuth, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ProfileUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("profiles")
      .update(sanitizeProfileRow(body))
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

profilesRouter.delete("/:id", requireWorkspaceHeader, requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb().from("profiles").delete().eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { profilesRouter };
