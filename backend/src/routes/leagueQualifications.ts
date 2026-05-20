import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import {
  LeagueQualificationCreateSchema,
  LeagueQualificationUpdateSchema,
} from "../types";

const leagueQualificationsRouter = new Hono();

leagueQualificationsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .select("*, minimum_level:certification_levels(*)")
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
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

leagueQualificationsRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, LeagueQualificationCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

leagueQualificationsRouter.put("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, LeagueQualificationUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("league_qualifications")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

leagueQualificationsRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb()
      .from("league_qualifications")
      .delete()
      .eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { leagueQualificationsRouter };
