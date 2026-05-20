<stack>
  Bun runtime, Hono web framework, Zod validation, Supabase (Postgres + Auth).
</stack>

<structure>
  src/index.ts          — App entry, middleware, route mounting, exports `default` + `app`
  src/env.ts            — Zod-validated env. Supabase keys are optional at boot (server warns if missing)
  src/db.ts             — serviceDb() (service-role, bypasses RLS) + anonClient() (JWT validation only)
  src/types.ts          — ★ Shared Zod schemas / TS types (source of truth for both apps)
  src/middleware/auth.ts — requireAuth, requireAdmin, optionalAuth
  src/lib/handleDb.ts   — dbError(c, e) + runRoute(c, fn) — wraps responses in { data } envelope
  src/lib/validate.ts   — parseJson(c, schema) — manual Zod parsing (returns 400 Response on failure)
  src/routes/           — One router per resource
  src/migrations/       — SQL files, run manually in Supabase SQL editor
</structure>

<routes>
  All routes are mounted under /api/* in src/index.ts.

  Response envelope:
    Success: c.json({ data: value })
    Error:   c.json({ error: { message, code } }, status)

  Pattern (with auth + body validation):
  ```typescript
  router.post("/", requireAdmin, async (c) =>
    runRoute(c, async () => {
      const body = await parseJson(c, MySchema);
      if (body instanceof Response) return body;
      const { data, error } = await serviceDb().from("table").insert(body).select("*").single();
      if (error) return dbError(c, error);
      return data;
    })
  );
  ```
</routes>

<auth>
  Validates Supabase JWT in `Authorization: Bearer <token>`.
  requireAdmin looks up profiles.role === 'ADMIN' (matched on user_id == auth.uid()).
  All DB writes go through the service-role client → RLS is bypassed for backend paths.
</auth>

<database>
  Supabase PostgreSQL. No Prisma — Supabase JS client only.

  Tables: certification_levels, league_qualifications, venues, profiles,
  games, assignments, settings.

  Add new tables by writing a new numbered SQL file in src/migrations/ and
  running it in the Supabase SQL editor. The RLS template lives in 0002.

  ⚠️ The server boots even without Supabase env vars — routes that hit the DB
  return 503 SUPABASE_NOT_CONFIGURED until SUPABASE_URL / SUPABASE_ANON_KEY /
  SUPABASE_SERVICE_ROLE_KEY are set in the Vibecode ENV tab.
</database>

<curl_testing>
  ALWAYS test APIs with cURL after implementing.
  Use $BACKEND_URL environment variable, never localhost.
  Health check: curl $BACKEND_URL/health
</curl_testing>

<vercel>
  src/index.ts has `export default { port, fetch: app.fetch }` for Bun dev
  AND a named `export { app }` so the Vercel Node adapter can use it. The
  root-level vercel.json rewrites /api/* and /health to this file.
</vercel>
