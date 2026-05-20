import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  isGameInSeason,
  parsePayRates,
  resolveGameFee,
  resolveMileage,
  resolveSeasonBounds,
} from "../lib/payCalculation";
import { requireAuth } from "../middleware/auth";

const earningsRouter = new Hono();

// ── GET /api/earnings/mine ────────────────────────────────────────────────────
earningsRouter.get("/mine", requireAuth, async (c) =>
  runRoute(c, async () => {
    const season = resolveSeasonBounds({
      season_start: c.req.query("season_start"),
      season_end: c.req.query("season_end"),
      year: c.req.query("year"),
    });

    const { data: profile } = await serviceDb()
      .from("profiles")
      .select("id, distance_km")
      .eq("user_id", c.get("userId"))
      .maybeSingle();

    if (!profile) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    const { data: rateSetting } = await serviceDb()
      .from("settings")
      .select("value")
      .eq("key", "pay_rates")
      .maybeSingle();

    const payRates = parsePayRates(rateSetting?.value);

    const { data: assignments, error } = await serviceDb()
      .from("assignments")
      .select(
        "id, position, payout_approved, game:games(date_time, league_tier, league_type)"
      )
      .eq("official_id", profile.id)
      .eq("status", "CONFIRMED");

    if (error) return dbError(c, error);

    const mileageBase = resolveMileage(payRates, profile.distance_km);
    let game_fees = 0;
    let mileage_payout = 0;
    let mileage_km = 0;
    let approved_count = 0;
    let assignment_count = 0;

    for (const a of assignments ?? []) {
      const rawGame = a.game;
      const game = (Array.isArray(rawGame) ? rawGame[0] : rawGame) as {
        date_time: string;
        league_tier: string | null;
        league_type: string | null;
      } | null;
      if (!game || !isGameInSeason(game.date_time, season)) continue;

      assignment_count++;
      const position = a.position as "REF1" | "REF2" | "LINE1" | "LINE2" | "SUPERVISOR";
      const { fee } = resolveGameFee(
        payRates,
        { league_tier: game.league_tier, league_type: game.league_type },
        position
      );
      game_fees += fee;
      mileage_payout += mileageBase.mileage_payout;
      mileage_km += mileageBase.mileage_km;
      if (a.payout_approved) approved_count++;
    }

    return {
      assignment_count,
      approved_count,
      game_fees,
      mileage_km,
      mileage_payout,
      total_due: game_fees + mileage_payout,
      distance_km: profile.distance_km ?? 0,
      cost_per_km: mileageBase.cost_per_km,
      season,
    };
  })
);

export { earningsRouter };
