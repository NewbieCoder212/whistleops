import { Hono } from "hono";
import { serviceDb } from "../db";
import { isResendConfigured } from "../env";
import { sendBulkEmail } from "../lib/email";
import { dbError, runRoute } from "../lib/handleDb";
import { parseJson } from "../lib/validate";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceHeader } from "../middleware/workspaceScope";
import {
  IncidentNotifyEmailsSchema,
  IncidentReportCreateSchema,
  type IncidentNotifyEmails,
} from "../types";

const incidentsRouter = new Hono();

async function getProfileId(userId: string): Promise<string | null> {
  const { data } = await serviceDb()
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

function parseNotifyEmails(raw: unknown): IncidentNotifyEmails {
  const parsed = IncidentNotifyEmailsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { Minor: [], Senior: [], "Adult Rec": [], default: [] };
}

// ── POST /api/incidents ───────────────────────────────────────────────────────
incidentsRouter.post("/", requireAuth, requireWorkspaceHeader, async (c) =>
  runRoute(c, async () => {
    const body = await parseJson(c, IncidentReportCreateSchema);
    if (body instanceof Response) return body;

    const profileId = await getProfileId(c.get("userId"));

    const workspaceId = c.get("workspaceId");
    const { data: game, error: gameErr } = await serviceDb()
      .from("games")
      .select("id, home_team, away_team, date_time, league_type, league_tier, workspace_id")
      .eq("id", body.game_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (gameErr) return dbError(c, gameErr);
    if (!game) {
      return c.json({ error: { message: "Game not found", code: "NOT_FOUND" } }, 404);
    }

    const { data: report, error } = await serviceDb()
      .from("incident_reports")
      .insert({
        game_id: body.game_id,
        submitted_by: profileId,
        body: body.body.trim(),
        league_type: game.league_type,
        league_tier: game.league_tier,
      })
      .select("*")
      .single();

    if (error) return dbError(c, error);

    let emails_sent = 0;
    if (isResendConfigured()) {
      const { data: setting } = await serviceDb()
        .from("settings")
        .select("value")
        .eq("workspace_id", workspaceId)
        .eq("key", "incident_notify_emails")
        .maybeSingle();

      const notify = parseNotifyEmails(setting?.value);
      const league = game.league_type as keyof IncidentNotifyEmails | null;
      const recipients = new Set<string>([
        ...notify.default,
        ...(league && Array.isArray(notify[league]) ? notify[league] : []),
      ]);

      if (recipients.size > 0) {
        const dt = new Date(game.date_time).toLocaleString("en-CA", {
          timeZone: "America/Moncton",
          dateStyle: "medium",
          timeStyle: "short",
        });
        const subject = `Incident report — ${game.home_team ?? "TBD"} vs ${game.away_team ?? "TBD"}`;
        const html = `
          <p><strong>Incident report submitted</strong></p>
          <p>Game: ${game.home_team ?? "TBD"} vs ${game.away_team ?? "TBD"}<br/>
          Date: ${dt}<br/>
          League: ${game.league_type ?? "—"} ${game.league_tier ? `(${game.league_tier})` : ""}</p>
          <hr/>
          <pre style="white-space:pre-wrap;font-family:sans-serif">${body.body.trim()}</pre>
        `;
        const recipientRows = [...recipients].map((email) => ({
          email,
          full_name: null as string | null,
        }));
        const { sent } = await sendBulkEmail(recipientRows, subject, html);
        emails_sent = sent.length;
      }
    }

    return { report, emails_sent };
  })
);

export { incidentsRouter };
