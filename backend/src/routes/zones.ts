import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";
import { ZoneCreateSchema, ZoneUpdateSchema } from "../types";

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
