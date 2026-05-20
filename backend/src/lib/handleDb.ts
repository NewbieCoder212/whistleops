/**
 * Common helpers for Supabase route handlers.
 */
import type { Context } from "hono";
import type { PostgrestError } from "@supabase/supabase-js";
import { SupabaseNotConfiguredError } from "../db";

export function dbError(c: Context, error: PostgrestError, fallbackStatus = 500) {
  const status =
    error.code === "23505" ? 409 :
    error.code === "23503" ? 400 :
    error.code === "PGRST116" ? 404 :
    fallbackStatus;
  return c.json(
    { error: { message: error.message, code: error.code ?? "DB_ERROR" } },
    status as 400 | 404 | 409 | 500
  );
}

export async function runRoute<T>(
  c: Context,
  fn: () => Promise<Response | T>
): Promise<Response> {
  try {
    const out = await fn();
    if (out instanceof Response) return out;
    return c.json({ data: out });
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) {
      return c.json(
        { error: { message: e.message, code: "SUPABASE_NOT_CONFIGURED" } },
        503
      );
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return c.json({ error: { message, code: "INTERNAL_ERROR" } }, 500);
  }
}
