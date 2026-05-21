import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseAvailabilityWindow } from "../lib/availabilityWindow";
import { DEFAULT_PAY_RATES_MATRIX } from "../lib/payCalculation";
import { DEFAULT_POSITION_LABELS } from "../lib/positionLabels";
import { DEFAULT_ROSTER_DISPLAY_FIELDS, IncidentNotifyEmailsSchema } from "../types";
import { parseJson } from "../lib/validate";
import { requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import { parsePayRates } from "../lib/payCalculation";
import { PayRatesMatrixSchema, SettingUpsertSchema } from "../types";

const settingsRouter = new Hono();
settingsRouter.use("*", requireWorkspaceHeader);

settingsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("settings")
      .select("*")
      .eq("workspace_id", c.get("workspaceId"));
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

settingsRouter.get("/:key", async (c) =>
  runRoute(c, async () => {
    const workspaceId = c.get("workspaceId");
    const { data, error } = await serviceDb()
      .from("settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("key", c.req.param("key"))
      .maybeSingle();
    if (error) return dbError(c, error);
    const key = c.req.param("key");
    if (!data) {
      if (key === "pay_rates") {
        return {
          key: "pay_rates",
          workspace_id: workspaceId,
          value: DEFAULT_PAY_RATES_MATRIX,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "position_labels") {
        return {
          key: "position_labels",
          workspace_id: workspaceId,
          value: DEFAULT_POSITION_LABELS,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "roster_display_fields") {
        return {
          key: "roster_display_fields",
          workspace_id: workspaceId,
          value: DEFAULT_ROSTER_DISPLAY_FIELDS,
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "availability_window") {
        return {
          key: "availability_window",
          workspace_id: workspaceId,
          value: parseAvailabilityWindow(null),
          updated_at: new Date().toISOString(),
        };
      }
      if (key === "incident_notify_emails") {
        return {
          key: "incident_notify_emails",
          workspace_id: workspaceId,
          value: IncidentNotifyEmailsSchema.parse({}),
          updated_at: new Date().toISOString(),
        };
      }
      return c.json({ error: { message: "Setting not found", code: "NOT_FOUND" } }, 404);
    }
    return data;
  })
);

settingsRouter.put("/:key", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, SettingUpsertSchema);
    if (body instanceof Response) return body;
    const key = c.req.param("key");
    const workspaceId = c.get("workspaceId");

    let value = body.value;
    if (key === "pay_rates") {
      const parsed = PayRatesMatrixSchema.safeParse(parsePayRates(body.value));
      if (!parsed.success) {
        return c.json(
          { error: { message: "Invalid pay rates matrix", code: "VALIDATION_ERROR" } },
          400
        );
      }
      value = parsed.data;
    }

    const { data, error } = await serviceDb()
      .from("settings")
      .upsert({
        workspace_id: workspaceId,
        key,
        value,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

export { settingsRouter };
