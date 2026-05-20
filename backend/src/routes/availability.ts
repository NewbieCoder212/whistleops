import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  isDateInAvailabilityWindow,
  parseAvailabilityWindow,
} from "../lib/availabilityWindow";
import { parseJson } from "../lib/validate";
import { requireAdmin, requireAuth } from "../middleware/auth";
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

async function loadAvailabilityWindow() {
  const { data } = await serviceDb()
    .from("settings")
    .select("value")
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
availabilityRouter.get("/window", async (c) =>
  runRoute(c, async () => {
    const window = await loadAvailabilityWindow();
    return { window };
  })
);

// ── GET /api/availability/overview ────────────────────────────────────────────
availabilityRouter.get("/overview", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const startQ = c.req.query("start");
    const endQ = c.req.query("end");
    const officialId = c.req.query("officialId");

    if (!startQ || !endQ) {
      return c.json(
        { error: { message: "Provide start and end (YYYY-MM-DD)", code: "VALIDATION_ERROR" } },
        400
      );
    }

    let profilesQ = serviceDb()
      .from("profiles")
      .select("id, full_name, email, zone_id")
      .in("role", ["OFFICIAL", "SUPERVISOR"])
      .order("full_name", { ascending: true });

    if (officialId) profilesQ = profilesQ.eq("id", officialId);

    const { data: profiles, error: profErr } = await profilesQ;
    if (profErr) return dbError(c, profErr);

    const { data: slots, error: slotErr } = await serviceDb()
      .from("availability")
      .select("*")
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

    const officials = (profiles ?? []).map((p) => ({
      official_id: p.id,
      full_name: p.full_name,
      email: p.email,
      zone_id: p.zone_id,
      slots: slotsByOfficial.get(p.id) ?? [],
    }));

    return { start: startQ, end: endQ, officials };
  })
);

// ── GET /api/availability ─────────────────────────────────────────────────────
availabilityRouter.get("/", requireAuth, async (c) =>
  runRoute(c, async () => {
    const month = c.req.query("month");
    const startQ = c.req.query("start");
    const endQ = c.req.query("end");

    const profileId = await getProfileId(c.get("userId"));
    if (!profileId) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    let q = serviceDb()
      .from("availability")
      .select("*")
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
    return data ?? [];
  })
);

// ── PUT /api/availability/:date ───────────────────────────────────────────────
availabilityRouter.put("/:date", requireAuth, async (c) =>
  runRoute(c, async () => {
    const date = c.req.param("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json(
        { error: { message: "date param must be YYYY-MM-DD", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const window = await loadAvailabilityWindow();
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

    const periods = derivePeriods(body.time_slots);

    const { data, error } = await serviceDb()
      .from("availability")
      .upsert(
        {
          official_id: profileId,
          date,
          time_slots: body.time_slots,
          ...periods,
        },
        { onConflict: "official_id,date" }
      )
      .select("*")
      .single();

    if (error) return dbError(c, error);
    return data;
  })
);

export { availabilityRouter };
