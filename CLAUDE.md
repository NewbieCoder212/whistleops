# WhistleOps Workspace

Developed in **Cursor** with local testing on **localhost**. (Not Vibecode.)

This workspace contains a React webapp and Hono backend server.

<projects>
  WhistleOps — officials scheduling app (React + Hono + Supabase).

  webapp/    — React app (port 8000)
  backend/   — Hono API server (port 3000), uses Supabase Postgres + Auth

  In production, the webapp uses relative URLs (/api/...) so it works on any domain.
  VITE_BACKEND_URL is only needed in development for cross-origin requests to the backend on a different port.

  Auth uses Supabase directly (browser → Supabase Auth). webapp/src/lib/api.ts
  auto-attaches the access token as a Bearer header on every request. The
  backend validates it via supabase.auth.getUser(token).

  Required env vars (webapp/.env and backend/.env — do not commit):
    Backend:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
    Frontend: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL=http://localhost:3000 (local dev)

  SQL migrations live in backend/src/migrations/ and must be run manually
  in the Supabase SQL editor (0001 → 0002 → 0003).
</projects>

<deploy>
  vercel.json at the workspace root configures a Vercel monorepo:
  - Vite build from webapp/, output to webapp/dist
  - `bun run build:vercel` bundles backend to api/index.js; rewrites /api/* → /api
  - /health → api/health.js; SPA fallback to index.html
  - Everything else falls through to the SPA's index.html
</deploy>

<agents>
  Use subagents for project-specific work:
  - backend-developer: Changes to the backend API
  - webapp-developer: Changes to the webapp frontend

  Each agent reads its project's CLAUDE.md for detailed instructions.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Define Zod schemas for request/response in backend/src/types.ts (shared contracts)
  2. Implement backend route using the schemas
  3. Test backend with cURL (local: http://localhost:3000; deployed: use deployment URL)
  4. Implement frontend, importing schemas from backend/src/types.ts to parse responses
  5. Test the integration

  <shared_types>
    All API contracts live in backend/src/types.ts as Zod schemas.
    Both backend and frontend can import from this file — single source of truth.
  </shared_types>
</coordination>

<skills>
  Shared skills in .claude/skills/:
  - database-auth: Set up Prisma + Better Auth for user accounts and data persistence
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade web interfaces using React, Tailwind, and shadcn/ui. Use when building pages, components, or styling any web UI.
</skills>

<environment>
  Local testing: webapp on localhost:8000, backend on localhost:3000 (see .cursor/rules/local-dev-cursor.mdc).
  User develops in Cursor; may run terminals, git, and browsers directly.
  Communicate clearly; prefer concrete localhost URLs and file paths when guiding setup.
</environment>
