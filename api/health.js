/** Lightweight health check — avoids loading the full API bundle on cold start. */
export default function handler() {
  return new Response(
    JSON.stringify({
      status: "ok",
      supabase: process.env.SUPABASE_URL ? "ready" : "missing-env-vars",
      resend: process.env.RESEND_API_KEY ? "ready" : "missing-env-vars",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
