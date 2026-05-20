import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireWorkspaceStaff } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import { VenueCreateSchema, VenueUpdateSchema } from "../types";

const venuesRouter = new Hono();
venuesRouter.use("*", requireWorkspaceHeader);

venuesRouter.get("/", async (c) =>
  runRoute(c, async () => {
    const assignableOnly = c.req.query("assignable") === "true";
    let q = serviceDb()
      .from("venues")
      .select("*")
      .eq("workspace_id", c.get("workspaceId"))
      .order("name", { ascending: true });
    if (assignableOnly) q = q.eq("assignable", true);
    const { data, error } = await q;
    if (error) return dbError(c, error);
    return data ?? [];
  })
);

venuesRouter.get("/:id", async (c) =>
  runRoute(c, async () => {
    const { data, error } = await serviceDb()
      .from("venues")
      .select("*")
      .eq("id", c.req.param("id"))
      .eq("workspace_id", c.get("workspaceId"))
      .maybeSingle();
    if (error) return dbError(c, error);
    if (!data) return c.json({ error: { message: "Venue not found", code: "NOT_FOUND" } }, 404);
    return data;
  })
);

venuesRouter.post("/", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, VenueCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("venues")
      .insert({ ...body, workspace_id: c.get("workspaceId") })
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

venuesRouter.put("/:id", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, VenueUpdateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("venues")
      .update(body)
      .eq("id", c.req.param("id"))
      .eq("workspace_id", c.get("workspaceId"))
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

venuesRouter.delete("/:id", requireWorkspaceStaff, async (c) =>
  runRoute(c, async () => {
    const id = c.req.param("id");
    const { error } = await serviceDb()
      .from("venues")
      .delete()
      .eq("id", id)
      .eq("workspace_id", c.get("workspaceId"));
    if (error) return dbError(c, error);
    return { id, deleted: true };
  })
);

export { venuesRouter };
