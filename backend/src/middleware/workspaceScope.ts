import type { MiddlewareHandler } from "hono";
import { workspaceIdFromRequest } from "../lib/workspace";

declare module "hono" {
  interface ContextVariableMap {
    workspaceId: string;
  }
}

/** Sets workspaceId from X-Workspace-Id; does not validate membership (pair with requireAuth). */
export const requireWorkspaceHeader: MiddlewareHandler = async (c, next) => {
  const workspaceId = workspaceIdFromRequest(c);
  if (!workspaceId) {
    return c.json(
      { error: { message: "Missing X-Workspace-Id header", code: "WORKSPACE_REQUIRED" } },
      400
    );
  }
  c.set("workspaceId", workspaceId);
  await next();
};
