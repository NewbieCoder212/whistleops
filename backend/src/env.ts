import { z } from "zod";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Bun's --hot mode doesn't re-read .env on module hot-swap, so we load it
// manually here. Works on Bun (import.meta.dir) and Node/Vercel (fileURLToPath).
function loadDotEnv() {
  try {
    const baseDir =
      typeof import.meta.dir === "string"
        ? import.meta.dir
        : dirname(fileURLToPath(import.meta.url));
    const content = readFileSync(resolve(baseDir, "../.env"), "utf-8");
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

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function validateEnv() {
  try {
    const parsed = envSchema.parse({
      PORT: emptyToUndefined(process.env.PORT),
      NODE_ENV: emptyToUndefined(process.env.NODE_ENV),
      SUPABASE_URL: emptyToUndefined(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: emptyToUndefined(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
      RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
      RESEND_FROM_EMAIL: emptyToUndefined(process.env.RESEND_FROM_EMAIL),
      GAMESHEET_WEBHOOK_SECRET: emptyToUndefined(process.env.GAMESHEET_WEBHOOK_SECRET),
    });
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
      // Do not process.exit in serverless — it crashes every invocation.
      return envSchema.parse({});
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
