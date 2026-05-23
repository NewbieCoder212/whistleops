import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import {
  assertFinanceZoneAccess,
  jsonForbidden,
} from "../lib/financeZoneAccess";
import { parsePayRates } from "../lib/payCalculation";
import {
  copyWorkspaceDefaultToZone,
  loadZonePayRatesRow,
  upsertZonePayRates,
} from "../lib/zonePayRates";
import { parseJson } from "../lib/validate";
import { requireAdmin, requirePayrollAccess } from "../middleware/auth";
import { PayRatesMatrixSchema, ZoneCreateSchema, ZonePayRatesUpsertSchema, ZoneUpdateSchema } from "../types";

const zonesRouter = new Hono();

zonesRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("zones")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

zonesRouter.get("/:zoneId/pay-rates", requirePayrollAccess, async (c) =>
  runRoute(c, async () => {
    const zoneId = c.req.param("zoneId");
    const access = assertFinanceZoneAccess(c.get("financeZoneScope"), zoneId);
    if (!access.ok) {
      return jsonForbidden(c, access.message, access.code);
    }

    const workspaceId = c.get("workspaceId");
    const { data: zone, error: zoneErr } = await serviceDb()
      .from("zones")
      .select("id")
      .eq("id", zoneId)
      .maybeSingle();
    if (zoneErr) return dbError(c, zoneErr);
    if (!zone) {
      return c.json({ error: { message: "Zone not found", code: "NOT_FOUND" } }, 404);
    }

    const { data: row } = await serviceDb()
      .from("zone_pay_rates")
      .select("updated_at")
      .eq("workspace_id", workspaceId)
      .eq("zone_id", zoneId)
      .maybeSingle();

    const { matrix, source } = await loadZonePayRatesRow(workspaceId, zoneId);
    return {
      zone_id: zoneId,
      pay_rates: matrix,
      source,
      updated_at: row?.updated_at ?? undefined,
    };
  })
);

zonesRouter.put("/:zoneId/pay-rates", requirePayrollAccess, async (c) =>
  runRoute(c, async () => {
    const zoneId = c.req.param("zoneId");
    const access = assertFinanceZoneAccess(c.get("financeZoneScope"), zoneId);
    if (!access.ok) {
      return jsonForbidden(c, access.message, access.code);
    }

    const body = await parseJson(c, ZonePayRatesUpsertSchema);
    if (body instanceof Response) return body;

    const parsed = PayRatesMatrixSchema.safeParse(parsePayRates(body.pay_rates));
    if (!parsed.success) {
      return c.json(
        { error: { message: "Invalid pay rates matrix", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const workspaceId = c.get("workspaceId");
    const { data: zone, error: zoneErr } = await serviceDb()
      .from("zones")
      .select("id")
      .eq("id", zoneId)
      .maybeSingle();
    if (zoneErr) return dbError(c, zoneErr);
    if (!zone) {
      return c.json({ error: { message: "Zone not found", code: "NOT_FOUND" } }, 404);
    }

    await upsertZonePayRates(workspaceId, zoneId, parsed.data);
    return {
      zone_id: zoneId,
      pay_rates: parsed.data,
      source: "zone" as const,
      updated_at: new Date().toISOString(),
    };
  })
);

zonesRouter.post("/:zoneId/pay-rates/copy-default", requirePayrollAccess, async (c) =>
  runRoute(c, async () => {
    const zoneId = c.req.param("zoneId");
    const access = assertFinanceZoneAccess(c.get("financeZoneScope"), zoneId);
    if (!access.ok) {
      return jsonForbidden(c, access.message, access.code);
    }

    const workspaceId = c.get("workspaceId");
    const matrix = await copyWorkspaceDefaultToZone(workspaceId, zoneId);
    return {
      zone_id: zoneId,
      pay_rates: matrix,
      source: "zone" as const,
      updated_at: new Date().toISOString(),
    };
  })
);

zonesRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ZoneCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("zones")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

zonesRouter.put("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, ZoneUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("zones")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

zonesRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const { error } = await serviceDb()
      .from("zones")
      .delete()
      .eq("id", c.req.param("id"));
    if (error) return dbError(c, error);
    return { id: c.req.param("id"), deleted: true };
  })
);

export { zonesRouter };
