/**
 * Supabase clients.
 *
 *   serviceDb()  — service-role client. Bypasses RLS. Used by all API routes.
 *   anonClient() — anon client. Used to validate user JWTs via getUser().
 *
 * Lazy-initialized so the server can still boot before Supabase env vars
 * are configured via the Vibecode ENV tab.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

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
    _service = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}

export function anonClient(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError();
  if (!_anon) {
    _anon = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anon;
}
