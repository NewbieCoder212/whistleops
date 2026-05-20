/**
 * Auth middleware.
 *
 *   requireAuth   — validates Bearer JWT via Supabase, sets userId/userEmail on c.
 *   requireAdmin  — runs requireAuth, then checks profiles.role === 'ADMIN'.
 *   optionalAuth  — populates user context if a valid token is present, otherwise continues.
 */
import type { Context, MiddlewareHandler } from "hono";
import { anonClient, serviceDb, SupabaseNotConfiguredError } from "../db";

type AuthVars = {
  userId: string;
  userEmail: string;
  profileId?: string;
  profileRole?: string;
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
    const { data, error } = await anonClient().auth.getUser(token);
    if (error || !data.user) {
      return c.json({ error: { message: "Invalid token", code: "UNAUTHENTICATED" } }, 401);
    }
    c.set("userId", data.user.id);
    c.set("userEmail", data.user.email ?? "");
    await next();
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json({ error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } }, 503);
    }
    throw e;
  }
};

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const token = bearer(c);
  if (!token) return next();
  try {
    const { data } = await anonClient().auth.getUser(token);
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
    const { data: authData, error: authError } = await anonClient().auth.getUser(token);
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
