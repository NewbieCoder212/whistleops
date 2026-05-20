import { Hono } from "hono";
import { serviceDb } from "../db";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { WorkspaceCreateSchema } from "../types";

const workspacesRouter = new Hono();

/** List workspaces the current user belongs to. */
workspacesRouter.get("/", requireAuth, async (c) =>
  runRoute(c, async () => {
    const userId = c.get("userId");
    const { data: profile, error: profileErr } = await serviceDb()
      .from("profiles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) return dbError(c, profileErr);
    if (!profile) return [];

    const { data: memberships, error: memErr } = await serviceDb()
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("profile_id", profile.id);
    if (memErr) return dbError(c, memErr);

    const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
    if (workspaceIds.length === 0 && profile.role === "ADMIN") {
      const { data: all, error } = await serviceDb()
        .from("workspaces")
        .select("*")
        .order("name");
      if (error) return dbError(c, error);
      return (all ?? []).map((w) => ({ ...w, member_role: "ADMIN" as const }));
    }

    if (workspaceIds.length === 0) return [];

    const { data: workspaces, error: wsErr } = await serviceDb()
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .order("name");
    if (wsErr) return dbError(c, wsErr);

    const roleByWs = new Map((memberships ?? []).map((m) => [m.workspace_id, m.role]));
    return (workspaces ?? []).map((w) => ({
      ...w,
      member_role: roleByWs.get(w.id) ?? profile.role,
    }));
  })
);

/** Create a child workspace (province admin). */
workspacesRouter.post("/", requireAdmin, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, WorkspaceCreateSchema);
    if (body instanceof Response) return body;
    const { data, error } = await serviceDb()
      .from("workspaces")
      .insert(body)
      .select("*")
      .single();
    if (error) return dbError(c, error);
    return data;
  })
);

export { workspacesRouter };
