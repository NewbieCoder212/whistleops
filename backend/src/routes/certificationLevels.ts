import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import {
  CertificationLevelCreateSchema,
  CertificationLevelUpdateSchema,
} from "../types";

const certificationLevelsRouter = new Hono();

certificationLevelsRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("certification_levels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

certificationLevelsRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("certification_levels")
      .select("*")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

certificationLevelsRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, CertificationLevelCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("certification_levels")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

certificationLevelsRouter.put("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, CertificationLevelUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("certification_levels")
      .update(body)
      .eq("id", c.req.param("id"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

certificationLevelsRouter.delete("/:id", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb()
      .from("certification_levels")
      .delete()
      .eq("id", id);
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { certificationLevelsRouter };
