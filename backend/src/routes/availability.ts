import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { loadBookedHoursByOfficial, loadBookedHoursForOfficial } from "../lib/assignmentBookedHours";
import {
  isDateInAvailabilityWindow,
  parseAvailabilityWindow,
} from "../lib/availabilityWindow";
import { parseJson } from "../lib/validate";
import { requireAuth, requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import { AvailabilityUpsertSchema } from "../types";

const availabilityRouter = new Hono();

async function getProfileId(userId: string): Promise<string | null> {
  const { data } = await serviceDb()
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

async function loadAvailabilityWindow(workspaceId: string) {
  const { data } = await serviceDb()
    .from("settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", "availability_window")
    .maybeSingle();
  return parseAvailabilityWindow(data?.value);
}

function derivePeriods(hours: number[]) {
  const s = new Set(hours);
  return {
    morning: [7, 8, 9, 10, 11].some((h) => s.has(h)),
    afternoon: [12, 13, 14, 15, 16].some((h) => s.has(h)),
    evening: [17, 18, 19, 20, 21, 22, 23, 0].some((h) => s.has(h)),
  };
}

// ── GET /api/availability/window ──────────────────────────────────────────────
availabilityRouter.get("/window", requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const window = await loadAvailabilityWindow(c.get("workspaceId"));
    return { window };
  })
);

// ── GET /api/availability/overview ────────────────────────────────────────────
availabilityRouter.get("/overview", requireWorkspaceHeader, requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
    const startQ = c.req.query("start");
    const endQ = c.req.query("end");
    const officialId = c.req.query("officialId");
    const zoneId = c.req.query("zoneId")?.trim() || undefined;

    if (!startQ || !endQ) {
      return c.json(
        { error: { message: "Provide start and end (YYYY-MM-DD)", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const { data: members, error: memErr } = await serviceDb()
      .from("workspace_members")
      .select("profile_id")
      .eq("workspace_id", workspaceId);
    if (memErr) return dbError(c, memErr);
    const memberIds = (members ?? []).map((m) => m.profile_id);
    if (memberIds.length === 0) {
      return { start: startQ, end: endQ, officials: [] };
    }

    let profilesQ = serviceDb()
      .from("profiles")
      .select("id, full_name, email, zone_id")
      .in("id", memberIds)
      .in("role", ["OFFICIAL", "SUPERVISOR"])
      .order("full_name", { ascending: true });

    if (officialId) profilesQ = profilesQ.eq("id", officialId);
    if (zoneId) profilesQ = profilesQ.eq("zone_id", zoneId);

    const { data: profiles, error: profErr } = await profilesQ;
    if (profErr) return dbError(c, profErr);

    const { data: slots, error: slotErr } = await serviceDb()
      .from("availability")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("date", startQ)
      .lte("date", endQ)
      .order("date", { ascending: true });

    if (slotErr) return dbError(c, slotErr);

    const slotsByOfficial = new Map<string, typeof slots>();
    for (const slot of slots ?? []) {
      const list = slotsByOfficial.get(slot.official_id) ?? [];
      list.push(slot);
      slotsByOfficial.set(slot.official_id, list);
    }

    const profileIds = (profiles ?? []).map((p) => p.id as string);
    const bookedMap = await loadBookedHoursByOfficial(
      workspaceId,
      profileIds,
      startQ,
      endQ
    );

    const officials = (profiles ?? []).map((p) => ({
      official_id: p.id,
      full_name: p.full_name,
      email: p.email,
      zone_id: p.zone_id,
      slots: slotsByOfficial.get(p.id) ?? [],
      booked_hours: bookedMap.get(p.id as string) ?? {},
    }));

    return { start: startQ, end: endQ, officials };
  })
);

// ── GET /api/availability ─────────────────────────────────────────────────────
availabilityRouter.get("/", requireAuth, requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const month = c.req.query("month");
    const startQ = c.req.query("start");
    const endQ = c.req.query("end");
    const workspaceId = c.get("workspaceId");

    const profileId = await getProfileId(c.get("userId"));
    if (!profileId) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    let q = serviceDb()
      .from("availability")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("official_id", profileId)
      .order("date", { ascending: true });

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return c.json({ error: { message: "month must be YYYY-MM", code: "VALIDATION_ERROR" } }, 400);
      }
      const [year, mon] = month.split("-").map(Number);
      const start = `${month}-01`;
      const next =
        mon === 12
          ? `${year! + 1}-01-01`
          : `${year}-${String(mon! + 1).padStart(2, "0")}-01`;
      q = q.gte("date", start).lt("date", next);
    } else if (startQ && endQ) {
      q = q.gte("date", startQ).lte("date", endQ);
    } else {
      return c.json(
        { error: { message: "Provide month or start+end params", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const { data, error } = await q;
    if (error) return dbError(c, error);

    if (startQ && endQ) {
      const booked_hours = await loadBookedHoursForOfficial(
        workspaceId,
        profileId,
        startQ,
        endQ
      );
      return { slots: data ?? [], booked_hours };
    }

    return data ?? [];
  })
);

// ── PUT /api/availability/:date ───────────────────────────────────────────────
availabilityRouter.put("/:date", requireAuth, requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const date = c.req.param("date");
    const workspaceId = c.get("workspaceId");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json(
        { error: { message: "date param must be YYYY-MM-DD", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const window = await loadAvailabilityWindow(workspaceId);
    const check = isDateInAvailabilityWindow(date, window);
    if (!check.allowed) {
      return c.json(
        { error: { message: check.message ?? "Outside availability window", code: "WINDOW_CLOSED" } },
        422
      );
    }

    const body = await parseJson(c, AvailabilityUpsertSchema);
    if (body instanceof Response) return body;

    const profileId = await getProfileId(c.get("userId"));
    if (!profileId) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    const bookedOnDate = await loadBookedHoursForOfficial(
      workspaceId,
      profileId,
      date,
      date
    );
    const bookedSet = new Set(bookedOnDate[date] ?? []);
    const time_slots = [...new Set([...body.time_slots, ...bookedSet])].sort(
      (a, b) => a - b
    );

    const periods = derivePeriods(time_slots);

    const { data, error } = await serviceDb()
      .from("availability")
      .upsert(
        {
          official_id: profileId,
          workspace_id: workspaceId,
          date,
          time_slots,
          ...periods,
        },
        { onConflict: "workspace_id,official_id,date" }
      )
      .select("*")
      .single();

    if (error) return dbError(c, error);
    return data;
  })
);

export { availabilityRouter };
