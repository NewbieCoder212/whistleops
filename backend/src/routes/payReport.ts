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
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import { PayApproveRequestSchema } from "../types";

const payReportRouter = new Hono();

// ── GET /api/pay-report ───────────────────────────────────────────────────────
// Aggregates CONFIRMED assignments per official. Optional ?year= or ?season_start/end.
payReportRouter.get("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const db = serviceDb();
    const season = resolveSeasonBounds({
      season_start: c.req.query("season_start"),
      season_end: c.req.query("season_end"),
      year: c.req.query("year"),
    });

    const { data: rateSetting } = await db
      .from("settings")
      .select("value")
      .eq("key", "pay_rates")
      .maybeSingle();

    const payRates = parsePayRates(rateSetting?.value);

    const { data: rows, error } = await db
      .from("assignments")
      .select(
        "id, game_id, official_id, position, status, payout_approved, " +
        "game:games(id, date_time, home_team, away_team, league_tier, league_type, venue:venues(name)), " +
        "official:profiles(id, full_name, email, official_type, distance_km)"
      )
      .eq("status", "CONFIRMED")
      .order("created_at", { ascending: true });

    if (error) return dbError(c, error);

    type GameSnap = {
      id: string;
      date_time: string;
      home_team: string | null;
      away_team: string | null;
      league_tier: string | null;
      league_type: string | null;
      venue: { name: string } | null;
    };
    type OfficialSnap = {
      id: string;
      full_name: string | null;
      email: string;
      official_type: string | null;
      distance_km: number | null;
    };
    type Row = {
      id: string;
      game_id: string;
      official_id: string;
      position: string;
      payout_approved: boolean;
      game: GameSnap | null;
      official: OfficialSnap | null;
    };

    const summaryMap = new Map<
      string,
      {
        official_id: string;
        official_name: string | null;
        official_email: string;
        official_type: string | null;
        game_fees: number;
        mileage_km: number;
        mileage_payout: number;
        total_due: number;
        all_approved: boolean;
        assignments: Array<{
          assignment_id: string;
          game_id: string;
          game_date: string;
          home_team: string | null;
          away_team: string | null;
          venue_name: string | null;
          position: string;
          game_fee: number;
          mileage_km: number;
          mileage_payout: number;
          payout_approved: boolean;
          rate_source: "tier" | "type" | "default";
          rate_label: string | null;
        }>;
      }
    >();

    for (const raw of (rows ?? []) as unknown as Row[]) {
      const official = raw.official;
      const game = raw.game;
      if (!official || !game) continue;
      if (!isGameInSeason(game.date_time, season)) continue;

      const position = raw.position as "REF1" | "REF2" | "LINE1" | "LINE2" | "SUPERVISOR";
      const { fee: gameFee, rate_source, rate_label } = resolveGameFee(
        payRates,
        { league_tier: game.league_tier, league_type: game.league_type },
        position
      );
      const mileage = resolveMileage(payRates, official.distance_km);
      const approved = raw.payout_approved ?? false;

      if (!summaryMap.has(official.id)) {
        summaryMap.set(official.id, {
          official_id: official.id,
          official_name: official.full_name,
          official_email: official.email,
          official_type: official.official_type,
          game_fees: 0,
          mileage_km: 0,
          mileage_payout: 0,
          total_due: 0,
          all_approved: true,
          assignments: [],
        });
      }

      const summary = summaryMap.get(official.id)!;
      summary.game_fees += gameFee;
      summary.mileage_km += mileage.mileage_km;
      summary.mileage_payout += mileage.mileage_payout;
      summary.total_due += gameFee + mileage.mileage_payout;
      if (!approved) summary.all_approved = false;

      summary.assignments.push({
        assignment_id: raw.id,
        game_id: raw.game_id,
        game_date: game.date_time,
        home_team: game.home_team,
        away_team: game.away_team,
        venue_name: game.venue?.name ?? null,
        position: raw.position,
        game_fee: gameFee,
        mileage_km: mileage.mileage_km,
        mileage_payout: mileage.mileage_payout,
        payout_approved: approved,
        rate_source,
        rate_label,
      });
    }

    const officials = Array.from(summaryMap.values())
      .sort((a, b) => (a.official_name ?? "").localeCompare(b.official_name ?? ""))
      .map((s) => ({ ...s, assignment_count: s.assignments.length }));

    return {
      officials,
      pay_rates: payRates,
      season,
      generated_at: new Date().toISOString(),
    };
  })
);

// ── POST /api/pay-report/approve ──────────────────────────────────────────────
payReportRouter.post("/approve", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, PayApproveRequestSchema);
    if (body instanceof Response) return body;

    const { data, error } = await serviceDb()
      .from("assignments")
      .update({ payout_approved: true })
      .eq("official_id", body.official_id)
      .eq("status", "CONFIRMED")
      .eq("payout_approved", false)
      .select("id");

    if (error) return dbError(c, error);
    return { approved_count: (data ?? []).length };
  })
);

export { payReportRouter };
