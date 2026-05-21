import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  dayQueryBounds,
  resolveAvailabilityStatus,
  storedGameDateKey,
  storedGameHour,
} from "../lib/availabilityMatch";
import {
  isOfficialQualified,
  resolveQualificationForGame,
} from "../lib/qualificationBoard";
import { requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import type { AssignBoardSlotHint, Position } from "../types";

const assignBoardRouter = new Hono();
assignBoardRouter.use("*", requireWorkspaceHeader);

const SLOT_POSITIONS: Position[] = ["REF1", "REF2", "LINE1", "LINE2", "SUPERVISOR"];

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function slotHint(
  availableQualified: number,
  qualifiedBusyOrUnavailable: number,
  hasOfficials: boolean,
  filled: boolean
): AssignBoardSlotHint {
  if (filled) return "filled";
  if (!hasOfficials) return "open_red";
  if (availableQualified > 0) return "open_green";
  if (qualifiedBusyOrUnavailable > 0) return "open_amber";
  return "open_red";
}

// ── GET /api/assign-board ─────────────────────────────────────────────────────
assignBoardRouter.get("/", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
    const date = c.req.query("date");
    const zoneId = c.req.query("zoneId");
    const leagueType = c.req.query("leagueType");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json(
        { error: { message: "Provide date=YYYY-MM-DD", code: "VALIDATION_ERROR" } },
        400
      );
    }
    if (!zoneId) {
      return c.json(
        { error: { message: "Provide zoneId", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const db = serviceDb();

    const { data: zone, error: zoneErr } = await db
      .from("zones")
      .select("id, name")
      .eq("id", zoneId)
      .maybeSingle();
    if (zoneErr) return dbError(c, zoneErr);
    if (!zone) {
      return c.json({ error: { message: "Zone not found", code: "NOT_FOUND" } }, 404);
    }

    const bounds = dayQueryBounds(date);

    const { data: zoneVenues, error: zoneVenueErr } = await db
      .from("venues")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("zone_id", zoneId);
    if (zoneVenueErr) return dbError(c, zoneVenueErr);
    const zoneVenueIds = new Set((zoneVenues ?? []).map((v) => v.id as string));

    let gamesQ = db
      .from("games")
      .select(
        "*, venue:venues(id, name, timezone, zone_id), " +
          "assignments(*, official:profiles(id, full_name, official_type, email))"
      )
      .eq("workspace_id", workspaceId)
      .gte("date_time", bounds.start)
      .lte("date_time", bounds.end)
      .order("date_time", { ascending: true });

    if (leagueType) gamesQ = gamesQ.eq("league_type", leagueType);

    const { data: gameRows, error: gamesErr } = await gamesQ;
    if (gamesErr) return dbError(c, gamesErr);

    const rawGames = (gameRows ?? []) as unknown as Array<Record<string, unknown>>;
    type VenueSnap = {
      id?: string;
      name?: string;
      zone_id?: string | null;
    };

    const gamesOnDate = rawGames.filter(
      (g) => storedGameDateKey(String(g.date_time)) === date
    );

    const games = gamesOnDate.filter((g) => {
      const venueId = g.venue_id as string | null | undefined;
      if (venueId && zoneVenueIds.has(venueId)) return true;
      const venue = unwrapOne(
        g.venue as VenueSnap | VenueSnap[] | null
      );
      return venue?.zone_id === zoneId;
    });

    const gameIdsInZone = new Set(games.map((g) => g.id as string));
    const rinksMissingZoneSet = new Set<string>();
    let gamesWithoutRink = 0;
    let gamesOtherZone = 0;

    for (const g of gamesOnDate) {
      if (gameIdsInZone.has(g.id as string)) continue;
      const venueId = g.venue_id as string | null | undefined;

      const venue = unwrapOne(g.venue as VenueSnap | VenueSnap[] | null);
      if (!venueId || !venue) {
        gamesWithoutRink++;
        continue;
      }
      if (!venue.zone_id) {
        rinksMissingZoneSet.add(venue.name?.trim() || "Unknown rink");
        continue;
      }
      gamesOtherZone++;
    }

    const hints = {
      games_on_date: gamesOnDate.length,
      games_in_zone: games.length,
      games_without_rink: gamesWithoutRink,
      rinks_missing_zone: Array.from(rinksMissingZoneSet).sort((a, b) => a.localeCompare(b)),
      games_other_zone: gamesOtherZone,
    };

    const { data: members, error: memErr } = await db
      .from("workspace_members")
      .select("profile_id")
      .eq("workspace_id", workspaceId);
    if (memErr) return dbError(c, memErr);
    const memberIds = (members ?? []).map((m) => m.profile_id);

    let officials: Array<Record<string, unknown>> = [];
    if (memberIds.length > 0) {
      const { data: profRows, error: profErr } = await db
        .from("profiles")
        .select("id, full_name, email, official_type, official_level_id, role, zone_id")
        .in("id", memberIds)
        .in("role", ["OFFICIAL", "SUPERVISOR"])
        .eq("zone_id", zoneId)
        .order("full_name", { ascending: true });
      if (profErr) return dbError(c, profErr);
      officials = profRows ?? [];
    }

    const officialIds = officials.map((o) => o.id as string);

    const { data: availRows, error: availErr } =
      officialIds.length > 0
        ? await db
            .from("availability")
            .select("official_id, time_slots")
            .eq("workspace_id", workspaceId)
            .eq("date", date)
            .in("official_id", officialIds)
        : { data: [], error: null };
    if (availErr) return dbError(c, availErr);

    const availByOfficial = new Map<string, number[]>();
    for (const row of availRows ?? []) {
      availByOfficial.set(
        row.official_id as string,
        (row.time_slots as number[]) ?? []
      );
    }

    const { data: levels, error: levErr } = await db
      .from("certification_levels")
      .select("id, name, sort_order");
    if (levErr) return dbError(c, levErr);
    const levelsById = new Map(
      (levels ?? []).map((l) => [l.id as string, l as { id: string; name: string; sort_order: number }])
    );

    const { data: qualifications, error: qualErr } = await db
      .from("league_qualifications")
      .select("league_name, minimum_level:certification_levels(id, name, sort_order)")
      .eq("workspace_id", workspaceId);
    if (qualErr) return dbError(c, qualErr);

    const allAssignmentsToday =
      officialIds.length > 0
        ? (
            await db
              .from("assignments")
              .select(
                "id, game_id, official_id, position, status, game:games(id, date_time, workspace_id)"
              )
              .in("official_id", officialIds)
              .in("status", ["PENDING", "CONFIRMED"])
          ).data ?? []
        : [];

    const busyByOfficial = new Map<string, Set<number>>();
    const assignmentsTodayByOfficial = new Map<
      string,
      Array<{ game_id: string; position: Position; game_hour: number }>
    >();

    type GameRef = { date_time: string; workspace_id: string };
    for (const a of allAssignmentsToday) {
      const rawGame = unwrapOne(a.game as GameRef | GameRef[] | null);
      if (!rawGame || storedGameDateKey(rawGame.date_time) !== date) continue;
      const hour = storedGameHour(rawGame.date_time);
      const oid = a.official_id as string;
      if (!busyByOfficial.has(oid)) busyByOfficial.set(oid, new Set());
      busyByOfficial.get(oid)!.add(hour);
      const list = assignmentsTodayByOfficial.get(oid) ?? [];
      list.push({
        game_id: a.game_id as string,
        position: a.position as Position,
        game_hour: hour,
      });
      assignmentsTodayByOfficial.set(oid, list);
    }

    const boardOfficials = officials.map((p) => {
      const oid = p.id as string;
      const levelId = p.official_level_id as string | null;
      const level = levelId ? levelsById.get(levelId) : undefined;
      return {
        official_id: oid,
        full_name: p.full_name as string | null,
        email: p.email as string,
        official_type: p.official_type as string | null,
        official_level_id: levelId,
        official_level_name: level?.name ?? null,
        time_slots: availByOfficial.get(oid) ?? [],
        busy_hours: Array.from(busyByOfficial.get(oid) ?? []),
        assignments_today: assignmentsTodayByOfficial.get(oid) ?? [],
      };
    });

    const qualRows = (qualifications ?? []).map((q) => ({
      league_name: q.league_name as string,
      minimum_level: unwrapOne(
        q.minimum_level as
          | { id: string; name: string; sort_order: number }
          | { id: string; name: string; sort_order: number }[]
          | null
      ),
    }));

    let pendingAssignmentsCount = 0;
    let confirmedAssignmentsCount = 0;
    let declinedAssignmentsCount = 0;
    let gamesAwaitingConfirmationCount = 0;

    const boardGames = games.map((g) => {
      const gameHour = storedGameHour(String(g.date_time));
      const rule = resolveQualificationForGame(
        {
          league_tier: g.league_tier as string | null,
          league_type: g.league_type as string | null,
        },
        qualRows
      );

      const rawAssignments = (g.assignments ?? []) as Array<Record<string, unknown>>;
      let gameHasPending = false;
      for (const a of rawAssignments) {
        const st = a.status as string;
        if (st === "PENDING") {
          pendingAssignmentsCount++;
          gameHasPending = true;
        } else if (st === "CONFIRMED") {
          confirmedAssignmentsCount++;
        } else if (st === "REJECTED") {
          declinedAssignmentsCount++;
        }
      }
      if (gameHasPending) gamesAwaitingConfirmationCount++;

      const assignmentByPos = new Map<string, Record<string, unknown>>();
      for (const a of rawAssignments) {
        assignmentByPos.set(a.position as string, a);
      }

      let availableQualified = 0;
      let qualifiedUnavailable = 0;

      for (const p of officials) {
        const oid = p.id as string;
        const timeSlots = availByOfficial.get(oid) ?? [];
        const busy = busyByOfficial.get(oid) ?? new Set();
        const qualified = isOfficialQualified(
          { official_level_id: p.official_level_id as string | null },
          rule,
          levelsById
        );
        if (!qualified) continue;
        const status = resolveAvailabilityStatus(
          timeSlots,
          Array.from(busy),
          gameHour
        );
        if (status === "available") availableQualified++;
        else if (status === "busy" || status === "unavailable") qualifiedUnavailable++;
      }

      const slots = SLOT_POSITIONS.map((position) => {
        const assignment = assignmentByPos.get(position) ?? null;
        const filled = !!assignment;
        return {
          position,
          assignment,
          available_qualified_count: availableQualified,
          slot_hint: slotHint(
            availableQualified,
            qualifiedUnavailable,
            officials.length > 0,
            filled
          ),
        };
      });

      return {
        ...g,
        game_hour: gameHour,
        slots,
      };
    });

    let openSlotsCount = 0;
    let nextUnassignedGameAt: string | null = null;

    for (const g of boardGames) {
      const slots = (g.slots ?? []) as Array<{ assignment: unknown; slot_hint: string }>;
      const hasOpen = slots.some(
        (s) => !s.assignment && s.slot_hint !== "filled"
      );
      for (const s of slots) {
        if (!s.assignment) openSlotsCount++;
      }
      if (hasOpen && !nextUnassignedGameAt) {
        nextUnassignedGameAt = String((g as Record<string, unknown>).date_time);
      }
    }

    const officialsWithSubmission = boardOfficials.filter(
      (o) => o.time_slots.length > 0
    ).length;

    const summary = {
      games_count: boardGames.length,
      open_slots_count: openSlotsCount,
      officials_count: boardOfficials.length,
      officials_with_submission_count: officialsWithSubmission,
      next_unassigned_game_at: nextUnassignedGameAt,
      pending_assignments_count: pendingAssignmentsCount,
      confirmed_assignments_count: confirmedAssignmentsCount,
      declined_assignments_count: declinedAssignmentsCount,
      games_awaiting_confirmation_count: gamesAwaitingConfirmationCount,
    };

    return {
      date,
      zone_id: zoneId,
      zone_name: zone.name as string,
      games: boardGames,
      officials: boardOfficials,
      summary,
      hints,
    };
  })
);

export { assignBoardRouter };
