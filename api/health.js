/** Lightweight health check — does not load the full Hono API bundle. */
export default function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      status: "ok",
      supabase: process.env.SUPABASE_URL ? "ready" : "missing-env-vars",
      resend: process.env.RESEND_API_KEY ? "ready" : "missing-env-vars",
    })
  );
}
