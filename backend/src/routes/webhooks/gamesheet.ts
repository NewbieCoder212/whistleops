/**
 * POST /api/webhooks/gamesheet — inbound Gamesheet Stats webhooks (no JWT).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { serviceDb } from "../../db";
import { gamesheetWebhookSecret, isSupabaseConfigured } from "../../env";
import {
  applyGamesheetUpdate,
  extractGamesheetEvent,
  findGameForEvent,
} from "../../lib/gamesheetSync";
import { GamesheetWebhookPayloadSchema } from "../../types";

const gamesheetWebhookRouter = new Hono();

function verifyGamesheetAuth(
  rawBody: string,
  headers: { authorization?: string; webhookSecret?: string; signature?: string }
): boolean {
  const secret = gamesheetWebhookSecret();
  if (!secret) return true;

  const bearer = headers.authorization?.startsWith("Bearer ")
    ? headers.authorization.slice(7)
    : null;
  if (bearer && safeEqual(bearer, secret)) return true;

  if (headers.webhookSecret && safeEqual(headers.webhookSecret, secret)) return true;

  if (headers.signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const sig = headers.signature.replace(/^sha256=/i, "").trim();
    if (safeEqual(sig, expected)) return true;
  }

  return false;
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return a === b;
  }
}

gamesheetWebhookRouter.post("/", async (c) => {
  if (!isSupabaseConfigured()) {
    return c.json(
      { error: { message: "Supabase not configured", code: "SUPABASE_NOT_CONFIGURED" } },
      503
    );
  }

  const rawBody = await c.req.text();
  const authorized = verifyGamesheetAuth(rawBody, {
    authorization: c.req.header("authorization") ?? c.req.header("Authorization"),
    webhookSecret: c.req.header("x-webhook-secret") ?? c.req.header("X-Webhook-Secret"),
    signature:
      c.req.header("x-gamesheet-signature") ?? c.req.header("X-Gamesheet-Signature"),
  });
  if (!authorized) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return c.json({ error: { message: "Invalid JSON body", code: "INVALID_JSON" } }, 400);
  }

  const zodResult = GamesheetWebhookPayloadSchema.safeParse(parsed);
  if (!zodResult.success) {
    return c.json(
      {
        error: {
          message: "Invalid webhook payload",
          code: "VALIDATION_ERROR",
          details: zodResult.error.flatten(),
        },
      },
      400
    );
  }

  const payload = zodResult.data;
  const extracted = extractGamesheetEvent(payload);
  const db = serviceDb();

  const { data: eventRow, error: insertErr } = await db
    .from("gamesheet_webhook_events")
    .insert({
      payload: parsed as Record<string, unknown>,
      event_type: extracted.eventType,
      gamesheet_external_id: extracted.externalId,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[gamesheet webhook] audit insert failed:", insertErr.message);
    return c.json({ error: { message: insertErr.message, code: "DB_ERROR" } }, 500);
  }

  const eventId = eventRow?.id as string | undefined;
  let matched = false;
  let gameId: string | undefined;
  let reason: string | undefined;
  let processError: string | null = null;

  try {
    const game = await findGameForEvent(db, extracted);
    if (!game) {
      reason = "no_matching_game";
    } else {
      await applyGamesheetUpdate(db, game.id, game, extracted);
      matched = true;
      gameId = game.id;
    }
  } catch (e) {
    processError = e instanceof Error ? e.message : "Processing failed";
    reason = processError;
  }

  if (eventId) {
    await db
      .from("gamesheet_webhook_events")
      .update({
        matched,
        game_id: gameId ?? null,
        error: processError,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);
  }

  return c.json({
    ok: true as const,
    matched,
    ...(gameId ? { game_id: gameId } : {}),
    ...(reason ? { reason } : {}),
  });
});

export { gamesheetWebhookRouter };
