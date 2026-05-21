/**
 * Auth middleware.
 *
 *   requireAuth   — validates Bearer JWT via Supabase, sets userId/userEmail on c.
 *   requireAdmin  — runs requireAuth, then checks profiles.role === 'ADMIN'.
 *   optionalAuth  — populates user context if a valid token is present, otherwise continues.
 */
import type { Context, MiddlewareHandler } from "hono";
import { getUserFromAccessToken, serviceDb, SupabaseNotConfiguredError } from "../db";
import {
  getWorkspaceMembership,
  isStaffRole,
  resolveProfileId,
  workspaceIdFromRequest,
} from "../lib/workspace";

type AuthVars = {
  userId: string;
  userEmail: string;
  profileId?: string;
  profileRole?: string;
  workspaceId: string;
  workspaceRole?: string;
};

declare module "hono" {
  interface ContextVariableMap extends AuthVars {}
}

function bearer(c: Context): string | null {
  const h = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = bearer(c);
  if (!token) {
    return c.json({ error: { message: "Missing bearer token", code: "UNAUTHENTICATED" } }, 401);
  }
  try {
    const { data, error } = await getUserFromAccessToken(token);
    if (error || !data.user) {
      const detail = error?.message?.trim();
      return c.json(
        {
          error: {
            message: detail || "Invalid token",
            code: "UNAUTHENTICATED",
          },
        },
        401
      );
    }
    c.set("userId", data.user.id);
    c.set("userEmail", data.user.email ?? "");
    await next();
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json({ error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } }, 503);
    }
    return c.json({ error: { message: "Invalid token", code: "UNAUTHENTICATED" } }, 401);
  }
};

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const token = bearer(c);
  if (!token) return next();
  try {
    const { data } = await getUserFromAccessToken(token);
    if (data?.user) {
      c.set("userId", data.user.id);
      c.set("userEmail", data.user.email ?? "");
    }
  } catch {
    // Swallow auth errors in optional mode.
  }
  await next();
};

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  // Token check (inlined to ensure every exit path returns a Response)
  const token = bearer(c);
  if (!token) {
    return c.json({ error: { message: "Missing bearer token", code: "UNAUTHENTICATED" } }, 401);
  }

  try {
    const { data: authData, error: authError } = await getUserFromAccessToken(token);
    if (authError || !authData.user) {
      return c.json({ error: { message: "Invalid token", code: "UNAUTHENTICATED" } }, 401);
    }
    c.set("userId", authData.user.id);
    c.set("userEmail", authData.user.email ?? "");
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json({ error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } }, 503);
    }
    throw e;
  }

  // Role check
  try {
    const { data, error } = await serviceDb()
      .from("profiles")
      .select("id, role")
      .eq("user_id", c.get("userId"))
      .maybeSingle();

    if (error) {
      return c.json({ error: { message: error.message, code: "PROFILE_LOOKUP_FAILED" } }, 500);
    }
    const adminRoles = ["ADMIN", "ASSIGNOR", "SUPERVISOR", "FINANCE"];
    if (!data || !adminRoles.includes(data.role)) {
      return c.json({ error: { message: "Admin role required", code: "FORBIDDEN" } }, 403);
    }
    c.set("profileId", data.id);
    c.set("profileRole", data.role);
    await next();
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json({ error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } }, 503);
    }
    throw e;
  }
};

async function loadWorkspaceContext(c: Context): Promise<Response | undefined> {
  const token = bearer(c);
  if (!token) {
    return c.json({ error: { message: "Missing bearer token", code: "UNAUTHENTICATED" } }, 401);
  }

  const workspaceId = workspaceIdFromRequest(c);
  if (!workspaceId) {
    return c.json(
      { error: { message: "Missing X-Workspace-Id header", code: "WORKSPACE_REQUIRED" } },
      400
    );
  }

  try {
    const { data: authData, error: authError } = await getUserFromAccessToken(token);
    if (authError || !authData.user) {
      return c.json({ error: { message: "Invalid token", code: "UNAUTHENTICATED" } }, 401);
    }
    c.set("userId", authData.user.id);
    c.set("userEmail", authData.user.email ?? "");

    const profileId = await resolveProfileId(authData.user.id);
    if (!profileId) {
      return c.json({ error: { message: "Profile not found", code: "FORBIDDEN" } }, 403);
    }
    c.set("profileId", profileId);

    const membership = await getWorkspaceMembership(workspaceId, profileId);
    const { data: profile } = await serviceDb()
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();

    const globalAdmin = profile?.role === "ADMIN";
    if (!membership && !globalAdmin) {
      return c.json(
        { error: { message: "Not a member of this workspace", code: "FORBIDDEN" } },
        403
      );
    }

    c.set("workspaceId", workspaceId);
    c.set("workspaceRole", membership?.role ?? profile?.role ?? "OFFICIAL");
    if (profile?.role) c.set("profileRole", profile.role);
    return undefined;
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json({ error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } }, 503);
    }
    throw e;
  }
}

/** Requires auth + X-Workspace-Id + membership in that workspace. */
export const requireWorkspace: MiddlewareHandler = async (c, next) => {
  const err = await loadWorkspaceContext(c);
  if (err) return err;
  await next();
};

/** Staff actions within a workspace (assignor, admin, finance, supervisor). */
export const requireWorkspaceStaff: MiddlewareHandler = async (c, next) => {
  const err = await loadWorkspaceContext(c);
  if (err) return err;

  const role = c.get("workspaceRole");
  const profileRole = c.get("profileRole");
  if (isStaffRole(role ?? "") || profileRole === "ADMIN") {
    await next();
    return;
  }
  return c.json(
    { error: { message: "Workspace staff role required", code: "FORBIDDEN" } },
    403
  );
};
