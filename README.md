# WhistleOps — Officials Scheduling

New Brunswick hockey officiating platform: assign games, manage roster and availability, run pay reports, and file incident reports.

**User guides:** [WhistleOps Officials Guide](docs/WHISTLEOPS_OFFICIALS_GUIDE.md) · [GrayJay vs WhistleOps comparison](docs/GRAYJAY_WHISTLEOPS_COMPARISON.md)

## Stack

| Layer    | Tech                                                |
| -------- | --------------------------------------------------- |
| Frontend | React 18 + Vite, Tailwind, shadcn/ui, React Query   |
| Backend  | Hono (Bun in dev, Vercel Node in prod)              |
| DB / Auth| Supabase (PostgreSQL + Auth)                        |
| Deploy   | Vercel monorepo (`vercel.json` at the root)         |

## Setup

1. **Create a Supabase project** at supabase.com.

2. **Add env vars via the Vibecode ENV tab.** Required:

   Backend:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   Frontend:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (dev only, when the backend is on another port)

3. **Run the SQL migrations** in the Supabase SQL Editor, in order:

   1. `backend/src/migrations/0001_initial_schema.sql` — tables + triggers
   2. `backend/src/migrations/0002_rls_policies.sql` — RLS templates
   3. `backend/src/migrations/0003_seed_certification_levels.sql` — seed Level 1–6

## Database schema

| Table                  | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `profiles`             | Officials / admins / supervisors. `official_level_id` → certification_levels |
| `games`                | Game schedule. Includes `league_tier` text and `status`       |
| `assignments`          | Official ↔ game per position (REF1/REF2/LINE1/LINE2/SUPERVISOR) |
| `venues`               | Arenas with location and IANA `timezone`                      |
| `settings`             | Flexible key/JSON store (jsonb)                               |
| `certification_levels` | **NEW** — replaces Goalline level strings                     |
| `league_qualifications`| **NEW** — minimum level required per league                   |

## API routes

All routes live under `/api/*` and return `{ data: T }` (errors return
`{ error: { message, code } }`).

| Route                            | Methods                          |
| -------------------------------- | -------------------------------- |
| `/api/profiles`                  | GET, GET `/me`, GET `/:id`, POST, PUT, DELETE |
| `/api/games`                     | GET, GET `/:id`, POST, PUT, DELETE |
| `/api/venues`                    | GET, GET `/:id`, POST, PUT, DELETE |
| `/api/assignments`               | GET, GET `/:id`, POST, PUT, DELETE |
| `/api/certification-levels`      | GET, GET `/:id`, POST, PUT, DELETE |
| `/api/league-qualifications`     | GET, GET `/:id`, POST, PUT, DELETE |
| `/api/settings`                  | GET, GET `/:key`, PUT `/:key`      |

Auth: writes require a Bearer JWT (issued by Supabase). Admin-only routes
also require `profiles.role = 'ADMIN'`. All DB access uses the service-role
key, so RLS policies in `0002_rls_policies.sql` protect direct browser
access only.

## Folder layout

```
.
├── vercel.json                       # Monorepo deploy config
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Hono app, exports both fetch & app
│   │   ├── env.ts                    # Zod-validated env
│   │   ├── db.ts                     # Supabase service + anon clients (lazy)
│   │   ├── types.ts                  # ★ Shared Zod schemas (source of truth)
│   │   ├── lib/
│   │   │   ├── handleDb.ts           # Error mapping + envelope helper
│   │   │   └── validate.ts           # parseJson(c, schema) helper
│   │   ├── middleware/
│   │   │   └── auth.ts               # requireAuth, requireAdmin, optionalAuth
│   │   ├── routes/                   # One file per resource
│   │   └── migrations/               # SQL — run manually in Supabase
│   └── package.json
└── webapp/
    ├── src/
    │   ├── App.tsx                   # Routes
    │   ├── pages/                    # Add pages here
    │   ├── components/ui/            # shadcn/ui primitives
    │   ├── features/                 # Feature folders (games, profiles, …)
    │   ├── hooks/
    │   │   └── useAuth.ts            # Supabase session hook
    │   └── lib/
    │       ├── supabase.ts           # Browser Supabase client
    │       ├── api.ts                # fetch wrapper, auto-attaches Bearer
    │       └── resources.ts          # Typed API clients per resource
    └── package.json
```

`@shared/*` is aliased in `webapp/tsconfig.app.json` and `vite.config.ts` to
`backend/src/*` so the frontend imports types directly from
`backend/src/types.ts`.

## Vercel deploy

`vercel.json` builds the Vite app from `webapp/dist` and routes `/api/*` +
`/health` to the Hono handler at `backend/src/index.ts` (which Vercel runs
as a single Node serverless function). Everything else falls through to the
SPA `index.html`.
