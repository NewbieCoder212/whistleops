import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  isGameInSeason,
  parsePayRates,
  resolveAssignmentPay,
  resolveSeasonBounds,
} from "../lib/payCalculation";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";

const earningsRouter = new Hono();

// ── GET /api/earnings/mine ────────────────────────────────────────────────────
earningsRouter.get("/mine", requireAuth, requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
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
      .eq("workspace_id", workspaceId)
      .eq("key", "pay_rates")
      .maybeSingle();

    const payRates = parsePayRates(rateSetting?.value);

    const { data: assignments, error } = await serviceDb()
      .from("assignments")
      .select(
        "id, position, payout_approved, game:games(date_time, league_tier, league_type, is_cash_game)"
      )
      .eq("official_id", profile.id)
      .eq("status", "CONFIRMED")
      .eq("game.workspace_id", workspaceId);

    if (error) return dbError(c, error);

    let game_fees = 0;
    let mileage_payout = 0;
    let mileage_km = 0;
    let approved_count = 0;
    let assignment_count = 0;
    let cost_per_km = payRates.default.cost_per_km;

    for (const a of assignments ?? []) {
      const rawGame = a.game;
      const game = (Array.isArray(rawGame) ? rawGame[0] : rawGame) as {
        date_time: string;
        league_tier: string | null;
        league_type: string | null;
        is_cash_game: boolean | null;
      } | null;
      if (!game || !isGameInSeason(game.date_time, season)) continue;

      assignment_count++;
      const position = a.position as "REF1" | "REF2" | "LINE1" | "LINE2" | "SUPERVISOR";
      const pay = resolveAssignmentPay(
        payRates,
        {
          league_tier: game.league_tier,
          league_type: game.league_type,
          is_cash_game: game.is_cash_game,
        },
        position,
        profile.distance_km
      );
      game_fees += pay.game_fee;
      mileage_payout += pay.mileage_payout;
      mileage_km += pay.mileage_km;
      cost_per_km = pay.cost_per_km;
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
      cost_per_km,
      season,
    };
  })
);

export { earningsRouter };
