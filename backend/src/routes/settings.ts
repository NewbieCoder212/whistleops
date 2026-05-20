import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseAvailabilityWindow } from "../lib/availabilityWindow";
import { DEFAULT_PAY_RATES_MATRIX } from "../lib/payCalculation";
import { DEFAULT_POSITION_LABELS } from "../lib/positionLabels";
import { DEFAULT_ROSTER_DISPLAY_FIELDS, IncidentNotifyEmailsSchema } from "../types";
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import { SettingUpsertSchema } from "../types";

const settingsRouter = new Hono();

settingsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb().from("settings").select("*");
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

settingsRouter.get("/:key", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("settings")
      .select("*")
      .eq("key", c.req.param("key"))
      .maybeSingle();
    if (error) return dbError(c, error);
    const key = c.req.param("key");
    if (!data) {
      if (key === "pay_rates") {
        return {
          key: "pay_rates",
          value: DEFAULT_PAY_RATES_MATRIX,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "position_labels") {
        return {
          key: "position_labels",
          value: DEFAULT_POSITION_LABELS,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "roster_display_fields") {
        return {
          key: "roster_display_fields",
          value: DEFAULT_ROSTER_DISPLAY_FIELDS,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "availability_window") {
        return {
          key: "availability_window",
          value: parseAvailabilityWindow(null),
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "incident_notify_emails") {
        return {
          key: "incident_notify_emails",
          value: IncidentNotifyEmailsSchema.parse({}),
          updated_at: new Date().toISOString(),
        };
      }
      return c.json({ error: { message: "Setting not found", code: "NOT_FOUND" } }, 404);
    }
    return data;
  })
);

settingsRouter.put("/:key", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, SettingUpsertSchema);
    if (body instanceof Response) return body;
    const key = c.req.param("key");
    const { data, error } = await serviceDb()
      .from("settings")
      .upsert({ key, value: body.value, updated_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

export { settingsRouter };
