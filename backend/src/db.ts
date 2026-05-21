/**
 * Supabase clients.
 *
 *   serviceDb()  — service-role client. Bypasses RLS. Used by all API routes.
 *   anonClient() — anon client (rare; prefer getUserFromAccessToken for JWT checks).
 *   getUserFromAccessToken() — JWT validation for auth middleware.
 *
 * VERCEL / NODE 20 — see docs/VERCEL_DEPLOY.md
 * Without `ws` as realtime.transport, auth.getUser() throws on Vercel Node 20
 * ("Node.js 20 detected without native WebSocket support") and login fails with 401.
 * Keep the `ws` dependency in package.json; it is bundled into api/index.js.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import { env, isSupabaseConfigured } from "./env";

const supabaseClientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
};

let _service: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase env vars not set. Add SUPABASE_URL, SUPABASE_ANON_KEY, " +
        "SUPABASE_SERVICE_ROLE_KEY in the Vibecode ENV tab."
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function serviceDb(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError();
  if (!_service) {
    _service = createClient(
      env.SUPABASE_URL!.trim(),
      env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      supabaseClientOptions
    );
  }
  return _service;
}

export function anonClient(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError();
  if (!_anon) {
    _anon = createClient(
      env.SUPABASE_URL!.trim(),
      env.SUPABASE_ANON_KEY!.trim(),
      supabaseClientOptions
    );
  }
  return _anon;
}

/** Validate user JWT. Uses service role so login still works if SUPABASE_ANON_KEY is wrong on Vercel. */
export async function getUserFromAccessToken(token: string) {
  return serviceDb().auth.getUser(token);
}
