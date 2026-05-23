import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  assertFinanceZoneAccess,
  jsonForbidden,
} from "../lib/financeZoneAccess";
import {
  isGameInSeason,
  resolveAssignmentPay,
  resolveSeasonBounds,
} from "../lib/payCalculation";
import { gameMatchesZoneFilter, loadZoneGameFilter } from "../lib/payReportZone";
import { loadPayRatesForVenueZone, loadWorkspaceDefaultPayRates, loadZonePayRatesRow } from "../lib/zonePayRates";
import { parseJson } from "../lib/validate";
import { requirePayrollAccess } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import { PayApproveRequestSchema } from "../types";

const payReportRouter = new Hono();
payReportRouter.use("*", requireWorkspaceHeader, requirePayrollAccess);

function unwrapVenueZone(
  venue: { zone_id: string | null } | { zone_id: string | null }[] | null
): string | null {
  if (!venue) return null;
  if (Array.isArray(venue)) return venue[0]?.zone_id ?? null;
  return venue.zone_id;
}

// ── GET /api/pay-report ───────────────────────────────────────────────────────
payReportRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const db = serviceDb();
    const workspaceId = c.get("workspaceId");
    const scope = c.get("financeZoneScope");
    const requestedZoneId = c.req.query("zoneId")?.trim() || undefined;
    const access = assertFinanceZoneAccess(scope, requestedZoneId);
    if (!access.ok) {
      return jsonForbidden(c, access.message, access.code);
    }
    const zoneId = access.effectiveZoneId ?? undefined;

    const season = resolveSeasonBounds({
      season_start: c.req.query("season_start"),
      season_end: c.req.query("season_end"),
      year: c.req.query("year"),
    });

    let zoneName: string | null = null;
    let zoneVenueIds: Set<string> | null = null;
    if (zoneId) {
      const { data: zone, error: zoneErr } = await db
        .from("zones")
        .select("id, name")
        .eq("id", zoneId)
        .maybeSingle();
      if (zoneErr) return dbError(c, zoneErr);
      if (!zone) {
        return c.json({ error: { message: "Zone not found", code: "NOT_FOUND" } }, 404);
      }
      zoneName = zone.name as string;
      const filter = await loadZoneGameFilter(workspaceId, zoneId);
      zoneVenueIds = filter.zoneVenueIds;
    }

    const payRatesHeader = zoneId
      ? (await loadZonePayRatesRow(workspaceId, zoneId)).matrix
      : await loadWorkspaceDefaultPayRates(workspaceId);

    const ratesCache = new Map<string, Awaited<ReturnType<typeof loadPayRatesForVenueZone>>>();

    async function payRatesForGame(venueZoneId: string | null): Promise<typeof payRatesHeader> {
      const key = venueZoneId ?? "__default__";
      if (!ratesCache.has(key)) {
        ratesCache.set(key, await loadPayRatesForVenueZone(workspaceId, venueZoneId));
      }
      return ratesCache.get(key)!;
    }

    const { data: rows, error } = await db
      .from("assignments")
      .select(
        "id, game_id, official_id, position, status, payout_approved, " +
          "game:games(id, date_time, venue_id, home_team, away_team, league_tier, league_type, is_cash_game, venue:venues(name, zone_id)), " +
          "official:profiles(id, full_name, email, official_type, distance_km)"
      )
      .eq("status", "CONFIRMED")
      .eq("game.workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) return dbError(c, error);

    type GameSnap = {
      id: string;
      date_time: string;
      venue_id: string | null;
      home_team: string | null;
      away_team: string | null;
      league_tier: string | null;
      league_type: string | null;
      is_cash_game: boolean | null;
      venue: { name: string; zone_id: string | null } | null;
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
          gross_game_fee: number;
          assigning_fee_deduction: number;
          game_fee: number;
          mileage_km: number;
          mileage_payout: number;
          payout_approved: boolean;
          rate_source: "tier" | "type" | "default";
          rate_label: string | null;
          cash_game: boolean;
          travel_pay_enabled: boolean;
          rate_zone_id: string | null;
        }>;
      }
    >();

    for (const raw of (rows ?? []) as unknown as Row[]) {
      const official = raw.official;
      const game = raw.game;
      if (!official || !game) continue;
      if (!isGameInSeason(game.date_time, season)) continue;
      if (
        zoneId &&
        !gameMatchesZoneFilter(
          { venue_id: game.venue_id, venue: game.venue },
          zoneId,
          zoneVenueIds
        )
      ) {
        continue;
      }

      const venueZoneId = unwrapVenueZone(game.venue);
      const payRates = await payRatesForGame(venueZoneId);

      const position = raw.position as "REF1" | "REF2" | "LINE1" | "LINE2" | "SUPERVISOR";
      const gameCtx = {
        league_tier: game.league_tier,
        league_type: game.league_type,
        is_cash_game: game.is_cash_game,
      };
      const pay = resolveAssignmentPay(payRates, gameCtx, position, official.distance_km);
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
      summary.game_fees += pay.game_fee;
      summary.mileage_km += pay.mileage_km;
      summary.mileage_payout += pay.mileage_payout;
      summary.total_due += pay.game_fee + pay.mileage_payout;
      if (!approved) summary.all_approved = false;

      summary.assignments.push({
        assignment_id: raw.id,
        game_id: raw.game_id,
        game_date: game.date_time,
        home_team: game.home_team,
        away_team: game.away_team,
        venue_name: game.venue?.name ?? null,
        position: raw.position,
        gross_game_fee: pay.gross_game_fee,
        assigning_fee_deduction: pay.assigning_fee_deduction,
        game_fee: pay.game_fee,
        mileage_km: pay.mileage_km,
        mileage_payout: pay.mileage_payout,
        payout_approved: approved,
        rate_source: pay.rate_source,
        rate_label: pay.rate_label,
        cash_game: pay.cash_game,
        travel_pay_enabled: pay.travel_pay_enabled,
        rate_zone_id: venueZoneId,
      });
    }

    const officials = Array.from(summaryMap.values())
      .sort((a, b) => (a.official_name ?? "").localeCompare(b.official_name ?? ""))
      .map((s) => ({ ...s, assignment_count: s.assignments.length }));

    return {
      officials,
      pay_rates: payRatesHeader,
      season,
      zone_id: zoneId ?? null,
      zone_name: zoneName,
      finance_scope: scope?.mode === "all" ? "all" : "zone",
      generated_at: new Date().toISOString(),
    };
  })
);

// ── POST /api/pay-report/approve ──────────────────────────────────────────────
payReportRouter.post("/approve", async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, PayApproveRequestSchema);
    if (body instanceof Response) return body;
    const workspaceId = c.get("workspaceId");
    const scope = c.get("financeZoneScope");
    const access = assertFinanceZoneAccess(scope, body.zone_id);
    if (!access.ok) {
      return jsonForbidden(c, access.message, access.code);
    }
    const effectiveZoneId = access.effectiveZoneId;

    let ids: string[];
    if (effectiveZoneId) {
      const { data: zone, error: zoneErr } = await serviceDb()
        .from("zones")
        .select("id")
        .eq("id", effectiveZoneId)
        .maybeSingle();
      if (zoneErr) return dbError(c, zoneErr);
      if (!zone) {
        return c.json({ error: { message: "Zone not found", code: "NOT_FOUND" } }, 404);
      }
      const filter = await loadZoneGameFilter(workspaceId, effectiveZoneId);
      ids = Array.from(filter.gameIds);
    } else {
      const { data: gameIds } = await serviceDb()
        .from("games")
        .select("id")
        .eq("workspace_id", workspaceId);
      ids = (gameIds ?? []).map((g) => g.id);
    }

    if (ids.length === 0) return { approved_count: 0 };

    const { data, error } = await serviceDb()
      .from("assignments")
      .update({ payout_approved: true })
      .eq("official_id", body.official_id)
      .eq("status", "CONFIRMED")
      .eq("payout_approved", false)
      .in("game_id", ids)
      .select("id");

    if (error) return dbError(c, error);
    return { approved_count: (data ?? []).length };
  })
);

export { payReportRouter };
