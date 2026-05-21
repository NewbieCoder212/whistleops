# Vercel deployment — lessons learned (do not regress)

This doc records production issues fixed for https://whistleops.vercel.app and the code that prevents them from coming back.

## Architecture (current, correct)

| Piece | Role |
|-------|------|
| `vercel.json` | Builds webapp + `bun run build:vercel`, rewrites `/api/*` |
| `api/index.js` | Bundled CJS from `backend/src/vercel-entry.ts` (committed after build) |
| `api/health.js` | Re-exports `index.js` so `/health` and `/api/health` work |
| `backend/src/vercel-entry.ts` | Restores API path after rewrite, then runs Hono |
| `backend/src/app.ts` | All routes mounted at `/api/...` |

**Do not** point Vercel `functions` at `backend/src/index.ts` or use pre-bundled-only paths without matching Vercel’s `api/` rules.

## Pitfall 1 — Nested API routes 404 (`/api/profiles/me`)

**Symptom:** Login succeeds in Supabase, app shows “no profile” or Vercel `NOT_FOUND` for `/api/profiles/me`.

**Cause:** `api/[[...path]].js` on Vercel only reliably serves **one** segment after `/api` (e.g. `/api/profiles` works, `/api/profiles/me` does not).

**Fix (keep both):**

1. `vercel.json`: `{ "source": "/api/(.*)", "destination": "/api?path=$1" }`
2. `vercel-entry.ts`: `restoreApiPath()` rebuilds `incoming.url` as `/api/profiles/me` before Hono runs.

**Do not** change the rewrite to `"/api"` only without `restoreApiPath` — that strips the path and breaks routing.

## Pitfall 2 — Login 401 / “Invalid token” on Vercel (Node 20)

**Symptom:** Valid Supabase session; `/api/profiles/me` returns 401. Error was: `Node.js 20 detected without native WebSocket support`.

**Cause:** `@supabase/supabase-js` initializes Realtime; on Vercel Node 20, `auth.getUser()` throws without a WebSocket transport.

**Fix (keep):** `backend/src/db.ts` — `import ws from "ws"` and `realtime: { transport: ws }` on all Supabase clients. Package `ws` must stay in `backend/package.json` (bundled into `api/index.js`).

**Optional:** Vercel project Node **22.x** reduces this class of issues; `engines.node` is `20.x` today.

## Pitfall 3 — Wrong env vars / misleading login errors

| Mistake | Result |
|---------|--------|
| `VITE_BACKEND_URL=http://localhost:3000` on **Vercel** | Browser calls localhost from users’ machines |
| `ANON_KEY` instead of `SUPABASE_ANON_KEY` on backend | Keys missing; 503 or auth failures |
| Backend `SUPABASE_*` ≠ frontend `VITE_SUPABASE_*` project | JWT validates locally, fails on Vercel |
| No `profiles` row for `auth.users.id` | 404 “no profile” (real data issue) |

**Vercel Production env (required):**

- Backend runtime: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Frontend build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Never** set `VITE_BACKEND_URL` on Vercel

**Local only:** `webapp/.env` → `VITE_BACKEND_URL=http://localhost:3000`; `backend/.env` → three `SUPABASE_*` vars (no `VITE_` prefix on backend).

**Code guards:**

- `webapp/src/lib/api.ts` — `import.meta.env.PROD` forces relative `/api` URLs.
- `backend/src/db.ts` — `getUserFromAccessToken()` uses service role (works if anon key is wrong but service key is right).
- `GET /health` and `GET /api/health` — `supabaseKeysMatch` should be `true` after deploy.

## Pitfall 4 — Things that broke deploys before (avoid)

- `hono/vercel` with `@vercel/node` → `headers.get is not a function` (use `@hono/node-server/vercel`)
- ESM `backend/` required from CJS `api/index.js` without bundling → `ERR_REQUIRE_ESM`
- `functions.runtime: "nodejs20.x"` in `vercel.json` → invalid runtime error
- Rewriting `/api/*` to `/api` **without** `restoreApiPath` → 500 / wrong routes

## After changing backend API or Vercel routing

```bash
cd backend && bun run build:vercel   # refreshes api/index.js
git add api/index.js && commit
```

Redeploy Vercel after env var changes (not only git push).

## Quick production checks

```bash
curl -s https://whistleops.vercel.app/health
# expect supabaseKeysMatch: true

curl -s https://whistleops.vercel.app/api/profiles/me
# without token → 401 JSON, not Vercel HTML NOT_FOUND
```

## Link profile to auth user (one-off)

```bash
cd backend && bun run scripts/link-profile.ts user@example.com ADMIN
```
