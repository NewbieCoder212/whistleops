import type { Context } from "hono";
import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { AssignmentCreateSchema, AssignmentUpdateSchema } from "../types";

const assignmentsRouter = new Hono();

/** Returns a 422/404 Response when the official fails league qualification rules. */
async function validateLeagueQualification(
  c: Context,
  gameId: string,
  officialId: string
): Promise<Response | null> {
  const db = serviceDb();

  const { data: game, error: gameError } = await db
    .from("games")
    .select("league_tier, league_type")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) return dbError(c, gameError);
  if (!game) {
    return c.json({ error: { message: "Game not found", code: "NOT_FOUND" } }, 404);
  }

  const leagueKeys: string[] = [];
  const tier = game.league_tier?.trim();
  const type = game.league_type?.trim();
  if (tier) leagueKeys.push(tier);
  if (type && type !== tier) leagueKeys.push(type);
  if (leagueKeys.length === 0) return null;

  let qualification: {
    minimum_level: { sort_order: number; name: string } | null;
    league_name: string;
  } | null = null;
  let matchedLeagueKey = leagueKeys[0]!;

  for (const key of leagueKeys) {
    const { data, error: qualError } = await db
      .from("league_qualifications")
      .select("*, minimum_level:certification_levels(*)")
      .ilike("league_name", key)
      .maybeSingle();
    if (qualError) return dbError(c, qualError);
    if (data?.minimum_level) {
      qualification = data;
      matchedLeagueKey = key;
      break;
    }
  }

  if (!qualification?.minimum_level) return null;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("official_level_id, full_name, email")
    .eq("id", officialId)
    .maybeSingle();
  if (profileError) return dbError(c, profileError);
  if (!profile) {
    return c.json({ error: { message: "Official not found", code: "NOT_FOUND" } }, 404);
  }

  const officialName = profile.full_name ?? profile.email ?? "This official";
  const minLevel = qualification.minimum_level;

  if (!profile.official_level_id) {
    return c.json(
      {
        error: {
          message: `${officialName} has no certification level set and cannot be assigned to ${matchedLeagueKey} games (minimum: ${minLevel.name}).`,
          code: "QUALIFICATION_NOT_MET",
        },
      },
      422
    );
  }

  const { data: officialLevel, error: levelError } = await db
    .from("certification_levels")
    .select("sort_order, name")
    .eq("id", profile.official_level_id)
    .maybeSingle();
  if (levelError) return dbError(c, levelError);
  if (!officialLevel) {
    return c.json(
      { error: { message: "Official certification level not found", code: "NOT_FOUND" } },
      404
    );
  }

  if (officialLevel.sort_order < minLevel.sort_order) {
    return c.json(
      {
        error: {
          message: `${officialName} (${officialLevel.name}) does not meet the minimum certification for ${matchedLeagueKey} games (required: ${minLevel.name}).`,
          code: "QUALIFICATION_NOT_MET",
        },
      },
      422
    );
  }

  return null;
}

// ── GET /api/assignments/mine ─────────────────────────────────────────────────
// Returns the calling official's own assignments with embedded game data.
assignmentsRouter.get("/mine", requireAuth, async (c) =>
  runRoute(c, async () => {
    const { data: profile } = await serviceDb()
      .from("profiles")
      .select("id")
      .eq("user_id", c.get("userId"))
      .maybeSingle();

    if (!profile) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    const status = c.req.query("status");
    let q = serviceDb()
      .from("assignments")
      .select("*, game:games(*, venue:venues(name))")
      .eq("official_id", profile.id)
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

assignmentsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const gameId = c.req.query("gameId");
    const officialId = c.req.query("officialId");
    const status = c.req.query("status");

    let q = serviceDb()
      .from("assignments")
      .select("*, game:games(*), official:profiles(*)")
      .order("created_at", { ascending: false });
    if (gameId) q = q.eq("game_id", gameId);
    if (officialId) q = q.eq("official_id", officialId);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

assignmentsRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("assignments")
      .select("*, game:games(*), official:profiles(*)")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Assignment not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

assignmentsRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, AssignmentCreateSchema);
    if (body instanceof Response) return body;

    const qualBlock = await validateLeagueQualification(c, body.game_id, body.official_id);
    if (qualBlock) return qualBlock;

    const { data, error } = await serviceDb()
      .from("assignments")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);

    // Move game to ASSIGNED when a position is filled.
    await serviceDb()
      .from("games")
      .update({ status: "ASSIGNED" })
      .eq("id", body.game_id)
      .eq("status", "UNASSIGNED");

    return data;
  })
);

assignmentsRouter.put("/:id", requireAuth, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, AssignmentUpdateSchema);
    if (body instanceof Response) return body;

    if (body.official_id) {
      const { data: existing, error: fetchError } = await serviceDb()
        .from("assignments")
        .select("game_id")
        .eq("id", c.req.param("id"))
        .maybeSingle();
      if (fetchError) return dbError(c, fetchError);
      if (!existing) {
        return c.json({ error: { message: "Assignment not found", code: "NOT_FOUND" } }, 404);
      }
      const qualBlock = await validateLeagueQualification(c, existing.game_id, body.official_id);
      if (qualBlock) return qualBlock;
    }

    const { data, error } = await serviceDb()
      .from("assignments")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

assignmentsRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb().from("assignments").delete().eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { assignmentsRouter };
