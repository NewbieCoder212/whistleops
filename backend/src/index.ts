import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "./env";
import { isResendConfigured, isSupabaseConfigured } from "./env";

import { profilesRouter } from "./routes/profiles";
import { gamesRouter } from "./routes/games";
import { venuesRouter } from "./routes/venues";
import { assignmentsRouter } from "./routes/assignments";
import { certificationLevelsRouter } from "./routes/certificationLevels";
import { leagueQualificationsRouter } from "./routes/leagueQualifications";
import { settingsRouter } from "./routes/settings";
import { payReportRouter } from "./routes/payReport";
import { availabilityRouter } from "./routes/availability";
import { earningsRouter } from "./routes/earnings";
import { zonesRouter } from "./routes/zones";
import { incidentsRouter } from "./routes/incidents";
import { gamesheetWebhookRouter } from "./routes/webhooks/gamesheet";
import { workspacesRouter } from "./routes/workspaces";

const app = new Hono();

// CORS — validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Workspace-Id"],
  })
);

app.use("*", logger());

// Health
app.get("/health", (c) =>
  c.json({
    status: "ok",
    supabase: isSupabaseConfigured() ? "ready" : "missing-env-vars",
    resend: isResendConfigured() ? "ready" : "missing-env-vars",
  })
);

// API routes
app.route("/api/profiles", profilesRouter);
app.route("/api/games", gamesRouter);
app.route("/api/venues", venuesRouter);
app.route("/api/assignments", assignmentsRouter);
app.route("/api/certification-levels", certificationLevelsRouter);
app.route("/api/league-qualifications", leagueQualificationsRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/pay-report", payReportRouter);
app.route("/api/availability", availabilityRouter);
app.route("/api/earnings", earningsRouter);
app.route("/api/zones", zonesRouter);
app.route("/api/incidents", incidentsRouter);
app.route("/api/webhooks/gamesheet", gamesheetWebhookRouter);
app.route("/api/workspaces", workspacesRouter);

// Catch-all for unknown API routes
app.notFound((c) =>
  c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404)
);

const port = Number(process.env.PORT) || 3000;

// Default export for Bun runtime + Vercel Node serverless (Hono's fetch is compatible).
export default {
  port,
  fetch: app.fetch,
};

// Also export the bare Hono app so Vercel's @vercel/node adapter or api/index.ts wrapper can use it.
export { app };
