# Vibecode Workspace

This workspace contains a mobile app and backend server.

<projects>
  WhistleOps — officials scheduling app (React + Hono + Supabase).

  webapp/    — React app (port 8000)
  backend/   — Hono API server (port 3000), uses Supabase Postgres + Auth

  In production, the webapp uses relative URLs (/api/...) so it works on any domain.
  VITE_BACKEND_URL is only needed in development for cross-origin requests to the backend on a different port.

  Auth uses Supabase directly (browser → Supabase Auth). webapp/src/lib/api.ts
  auto-attaches the access token as a Bearer header on every request. The
  backend validates it via supabase.auth.getUser(token).

  Required env vars (set via Vibecode ENV tab):
    Backend:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
    Frontend: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, (VITE_BACKEND_URL in dev)

  SQL migrations live in backend/src/migrations/ and must be run manually
  in the Supabase SQL editor (0001 → 0002 → 0003).
</projects>

<deploy>
  vercel.json at the workspace root configures a Vercel monorepo:
  - Vite build from webapp/, output to webapp/dist
  - /api/* and /health rewritten to backend/src/index.ts (Vercel Node serverless)
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
  3. Test backend with cURL (use $BACKEND_URL, never localhost)
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
  System manages git and dev servers. DO NOT manage these.
  The user views the app through Vibecode Mobile App with a webview preview or Vibecode Web App with an iframe preview.
  The user cannot see code or terminal. Do everything for them.
  Write one-off scripts to achieve tasks the user asks for.
  Communicate in an easy to understand manner for non-technical users.
  Be concise and don't talk too much.
</environment>
