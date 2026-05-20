import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import {
  LeagueQualificationCreateSchema,
  LeagueQualificationUpdateSchema,
} from "../types";

const leagueQualificationsRouter = new Hono();
leagueQualificationsRouter.use("*", requireWorkspaceHeader);

leagueQualificationsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .select("*, minimum_level:certification_levels(*)")
      .eq("workspace_id", c.get("workspaceId"))
      .order("league_name", { ascending: true });
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

leagueQualificationsRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .select("*, minimum_level:certification_levels(*)")
      .eq("id", c.req.param("id"))
      .eq("workspace_id", c.get("workspaceId"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

leagueQualificationsRouter.post("/", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, LeagueQualificationCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .insert({ ...body, workspace_id: c.get("workspaceId") })
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

leagueQualificationsRouter.put("/:id", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, LeagueQualificationUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .update(body)
      .eq("id", c.req.param("id"))
      .eq("workspace_id", c.get("workspaceId"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

leagueQualificationsRouter.delete("/:id", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb()
      .from("league_qualifications")
      .delete()
      .eq("id", id)
      .eq("workspace_id", c.get("workspaceId"));
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { leagueQualificationsRouter };
