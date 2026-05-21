import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "./env";
import { env, isResendConfigured, isSupabaseConfigured } from "./env";

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

function supabaseProjectFromUrl(url?: string): string | null {
  const m = url?.trim().match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

function supabaseProjectFromAnonKey(key?: string): string | null {
  if (!key?.trim()) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(key.trim().split(".")[1]!, "base64url").toString("utf8")
    ) as { ref?: string };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

const healthPayload = () => {
  const urlProject = supabaseProjectFromUrl(env.SUPABASE_URL);
  const anonProject = supabaseProjectFromAnonKey(env.SUPABASE_ANON_KEY);
  return {
    status: "ok",
    supabase: isSupabaseConfigured() ? "ready" : "missing-env-vars",
    resend: isResendConfigured() ? "ready" : "missing-env-vars",
    supabaseProject: urlProject,
    anonKeyProject: anonProject,
    supabaseKeysMatch: !!(urlProject && anonProject && urlProject === anonProject),
  };
};

app.get("/health", (c) => c.json(healthPayload()));
app.get("/api/health", (c) => c.json(healthPayload()));

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

app.notFound((c) =>
  c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404)
);

export { app };
