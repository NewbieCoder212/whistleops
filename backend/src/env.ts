import { z } from "zod";
import { readFileSync } from "fs";
import { resolve } from "path";

// Bun's --hot mode doesn't re-read .env on module hot-swap, so we load it
// manually here. This ensures env vars added after the process started are
// picked up on the next hot reload without a full process restart.
function loadDotEnv() {
  try {
    const content = readFileSync(resolve(import.meta.dir, "../.env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key) process.env[key] = val;
    }
  } catch {
    // .env may not exist in production — that's fine.
  }
}

loadDotEnv();

const envSchema = z.object({
  PORT: z.string().optional().default("3000"),
  NODE_ENV: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),
  GAMESHEET_WEBHOOK_SECRET: z.string().optional(),
});

function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    const hasSupabase = !!(
      parsed.SUPABASE_URL &&
      parsed.SUPABASE_ANON_KEY &&
      parsed.SUPABASE_SERVICE_ROLE_KEY
    );
    if (hasSupabase) {
      console.log("✅ Environment validated (Supabase configured)");
    } else {
      console.warn(
        "⚠️  Supabase env vars missing. Add SUPABASE_URL, SUPABASE_ANON_KEY, " +
          "SUPABASE_SERVICE_ROLE_KEY via the Vibecode ENV tab. Routes that need " +
          "the database will return 503 until then."
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;

export const isSupabaseConfigured = (): boolean =>
  !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);

export const isResendConfigured = (): boolean => !!env.RESEND_API_KEY;

export const resendFromEmail = (): string =>
  env.RESEND_FROM_EMAIL ?? "WhistleOps <onboarding@resend.dev>";

/** When set, POST /api/webhooks/gamesheet requires Bearer, X-Webhook-Secret, or HMAC signature. */
export const gamesheetWebhookSecret = (): string | undefined =>
  env.GAMESHEET_WEBHOOK_SECRET?.trim() || undefined;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
