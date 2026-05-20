# WhistleOps — Handoff Blueprint

> **Project:** WhistleOps — Hockey Officials Scheduling Platform
> **Province:** New Brunswick, Canada
> **Stack:** React 18 + Vite · Hono (Bun) · Supabase (Postgres + Auth) · Vercel
> **Generated:** 2026-05-20

---

## 1. Project Tree

```
workspace/
├── vercel.json                        # Monorepo deploy config (see §3)
├── api/
│   └── index.ts                       # Vercel serverless entry (hono/vercel → backend app)
├── CLAUDE.md                          # AI agent workspace instructions
├── HANDOFF_BLUEPRINT.md               # ← this file
│
├── backend/                           # Hono API server (dev: port 3000)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # App entry — mounts all routers, CORS, logger
│       ├── env.ts                     # Zod-validated env vars (Supabase keys)
│       ├── db.ts                      # serviceDb() [service-role] + anonClient() [JWT]
│       ├── types.ts                   # ★ Shared Zod schemas & TS types (single source of truth)
│       │
│       ├── middleware/
│       │   └── auth.ts                # requireAuth · requireAdmin · optionalAuth
│       │
│       ├── lib/
│       │   ├── handleDb.ts            # runRoute() envelope + dbError() mapper
│       │   └── validate.ts            # parseJson(c, schema) — Zod body parsing
│       │
│       ├── routes/
│       │   ├── profiles.ts            # GET / · GET /me · GET /:id · POST / · PUT /:id · DELETE /:id
│       │   ├── games.ts               # GET / · GET /:id · POST / · POST /bulk · PUT /:id · DELETE /:id
│       │   ├── venues.ts              # CRUD — GET / · GET /:id · POST · PUT /:id · DELETE /:id
│       │   ├── assignments.ts         # GET /mine · GET / · GET /:id · POST · PUT /:id · DELETE /:id
│       │   ├── availability.ts        # GET /?start&end (week) or ?month · PUT /:date
│       │   ├── certificationLevels.ts # CRUD — admin-gated write operations
│       │   ├── leagueQualifications.ts# CRUD — min certification level per league
│       │   ├── zones.ts               # CRUD — NB provincial zones
│       │   ├── settings.ts            # GET / · GET /:key · PUT /:key (admin)
│       │   ├── payReport.ts           # GET / (aggregated) · POST /approve
│       │   └── earnings.ts            # GET /mine — official's season summary
│       │
│       └── migrations/                # Run sequentially in Supabase SQL Editor
│           ├── 0001_initial_schema.sql        # Core tables: profiles, games, venues, assignments, settings
│           ├── 0002_rls_policies.sql           # Row-Level Security for all tables
│           ├── 0003_seed_certification_levels.sql # NB Hockey certification levels seed data
│           ├── 0004_payout_approved.sql        # assignments.payout_approved boolean column
│           ├── 0005_availability.sql           # availability table (official_id, date, period booleans)
│           ├── 0006_add_assignor_role.sql      # ASSIGNOR role added to profiles check constraint
│           ├── 0007_availability_time_slots.sql# availability.time_slots JSONB column
│           └── 0008_zones_and_league_type.sql  # zones table · zone_id FKs · games.league_type
│
└── webapp/                            # Vite React SPA (dev: port 8000, served from port 8080)
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── components.json                # shadcn/ui component registry
    ├── tsconfig.app.json
    │
    └── src/
        ├── main.tsx                   # React root mount
        ├── App.tsx                    # React Router v6 route tree
        │
        ├── lib/
        │   ├── api.ts                 # fetch wrapper — auto-attaches Supabase Bearer token
        │   ├── resources.ts           # Typed resource clients (gamesApi, profilesApi, …)
        │   ├── supabase.ts            # Supabase browser client
        │   └── utils.ts               # cn() Tailwind class merger
        │
        ├── hooks/
        │   ├── useAuth.ts             # Supabase session + signIn / signOut
        │   ├── useProfile.ts          # React Query hook for /api/profiles/me
        │   └── use-mobile.tsx         # Viewport breakpoint hook
        │
        ├── components/
        │   ├── AdminRoute.tsx         # Requires session + ADMIN_ROLES — else redirect
        │   ├── ProtectedRoute.tsx     # Requires session — else redirect to /login
        │   ├── NavLink.tsx            # Active-state nav link helper
        │   └── layout/
        │       ├── AdminLayout.tsx    # Desktop sidebar + mobile hamburger Sheet drawer
        │       └── DashboardLayout.tsx# Sticky top bar + mobile bottom nav (3 tabs)
        │
        ├── features/
        │   ├── availability/
        │   │   └── AvailabilityCalendar.tsx   # Week-grid table · hour checkboxes · debounced saves
        │   ├── certification/
        │   │   ├── CertificationLevelsPanel.tsx
        │   │   └── LeagueQualificationsPanel.tsx
        │   ├── filters/
        │   │   └── ZoneLeagueFilter.tsx       # Reusable zone + league type filter bar
        │   ├── finance/
        │   │   └── OfficialPayRow.tsx          # Expandable pay summary row with approve button
        │   ├── games/
        │   │   ├── ImportDropZone.tsx          # Drag-and-drop CSV file picker
        │   │   ├── ImportPreviewTable.tsx      # Pre-import validation table
        │   │   └── csvParser.ts               # Client-side CSV → BulkGameRow[] parser
        │   ├── officials/
        │   │   ├── OfficialsTable.tsx          # Sortable officials roster table
        │   │   └── OfficialDrawer.tsx          # Edit / create official slide-over
        │   └── schedule/
        │       ├── ScheduleGameCard.tsx        # Game card with assignment slot buttons
        │       ├── AssignPanel.tsx             # Slide-over to assign / reassign officials
        │       └── scheduleTypes.ts            # Local TS types for schedule feature
        │
        └── pages/
            ├── Login.tsx                      # Split-panel login · role-based post-login routing
            ├── NotFound.tsx
            ├── admin/
            │   ├── Dashboard.tsx              # Stats tiles + today's games + quick links
            │   ├── Schedule.tsx               # Game list grouped by date · assignment slots
            │   ├── Officials.tsx              # Full roster with OfficialDrawer
            │   ├── ImportGames.tsx            # CSV drag-drop → preview → bulk import
            │   ├── Finance.tsx                # Pay report table · per-official approval
            │   └── AdminConfig.tsx            # Certification levels + league qualifications panels
            └── dashboard/
                ├── Schedule.tsx               # Official's PENDING + CONFIRMED assignments
                ├── Availability.tsx           # Week availability grid + zone/league filter
                └── Profile.tsx                # Contact info + season earnings summary
```

---

## 2. Route Map

### Frontend Routes (`webapp/src/App.tsx`)

| Path | Component | Guard |
|---|---|---|
| `/` | → redirect | — |
| `/login` | `Login.tsx` | public |
| `/admin` | → `/admin/dashboard` | `AdminRoute` |
| `/admin/dashboard` | `admin/Dashboard.tsx` | `AdminRoute` |
| `/admin/schedule` | `admin/Schedule.tsx` | `AdminRoute` |
| `/admin/officials` | `admin/Officials.tsx` | `AdminRoute` |
| `/admin/import-games` | `admin/ImportGames.tsx` | `AdminRoute` |
| `/admin/finance` | `admin/Finance.tsx` | `AdminRoute` |
| `/admin/config` | `admin/AdminConfig.tsx` | `AdminRoute` |
| `/dashboard` | → `/dashboard/schedule` | `ProtectedRoute` |
| `/dashboard/schedule` | `dashboard/Schedule.tsx` | `ProtectedRoute` |
| `/dashboard/availability` | `dashboard/Availability.tsx` | `ProtectedRoute` |
| `/dashboard/profile` | `dashboard/Profile.tsx` | `ProtectedRoute` |

**`AdminRoute`** — requires valid session AND `profile.role` in `["ADMIN", "ASSIGNOR", "SUPERVISOR", "FINANCE"]`.  
**`ProtectedRoute`** — requires a valid Supabase session only.

### Backend API Routes (`backend/src/routes/`)

All routes are prefixed `/api/` and mounted in `backend/src/index.ts`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/profiles` | public | List all profiles |
| GET | `/api/profiles/me` | `requireAuth` | Caller's own profile |
| GET | `/api/profiles/:id` | public | Profile by ID |
| POST | `/api/profiles` | `requireAuth` | Create profile |
| PUT | `/api/profiles/:id` | `requireAuth` | Update profile |
| DELETE | `/api/profiles/:id` | `requireAdmin` | Delete profile |
| GET | `/api/games` | public | List games (`?startDate`, `?endDate`, `?status`) |
| GET | `/api/games/:id` | public | Game with venue + assignments |
| POST | `/api/games` | `requireAdmin` | Create game |
| POST | `/api/games/bulk` | `requireAdmin` | Bulk import from CSV rows |
| PUT | `/api/games/:id` | `requireAdmin` | Update game |
| DELETE | `/api/games/:id` | `requireAdmin` | Delete game |
| GET | `/api/venues` | public | List venues |
| GET | `/api/venues/:id` | public | Venue by ID |
| POST | `/api/venues` | `requireAdmin` | Create venue |
| PUT | `/api/venues/:id` | `requireAdmin` | Update venue |
| DELETE | `/api/venues/:id` | `requireAdmin` | Delete venue |
| GET | `/api/assignments/mine` | `requireAuth` | Caller's assignments with game data |
| GET | `/api/assignments` | public | List assignments (`?gameId`, `?officialId`, `?status`) |
| POST | `/api/assignments` | `requireAdmin` | Create assignment (auto-sets game → ASSIGNED) |
| PUT | `/api/assignments/:id` | `requireAuth` | Update assignment (Accept/Decline) |
| DELETE | `/api/assignments/:id` | `requireAdmin` | Delete assignment |
| GET | `/api/availability` | `requireAuth` | Caller's slots (`?start&end` or `?month`) |
| PUT | `/api/availability/:date` | `requireAuth` | Upsert hour slots for a date |
| GET | `/api/certification-levels` | public | List levels ordered by sort_order |
| POST | `/api/certification-levels` | `requireAdmin` | Create level |
| PUT | `/api/certification-levels/:id` | `requireAdmin` | Update level |
| DELETE | `/api/certification-levels/:id` | `requireAdmin` | Delete level |
| GET | `/api/league-qualifications` | public | List with joined `minimum_level` |
| POST | `/api/league-qualifications` | `requireAdmin` | Create qualification rule |
| PUT | `/api/league-qualifications/:id` | `requireAdmin` | Update rule |
| DELETE | `/api/league-qualifications/:id` | `requireAdmin` | Delete rule |
| GET | `/api/zones` | public | List NB zones ordered by sort_order |
| POST | `/api/zones` | `requireAdmin` | Create zone |
| PUT | `/api/zones/:id` | `requireAdmin` | Update zone |
| DELETE | `/api/zones/:id` | `requireAdmin` | Delete zone |
| GET | `/api/settings` | public | List all settings key/value pairs |
| GET | `/api/settings/:key` | public | Single setting by key |
| PUT | `/api/settings/:key` | `requireAdmin` | Upsert setting (JSONB value) |
| GET | `/api/pay-report` | `requireAdmin` | Aggregated pay summary for all officials |
| POST | `/api/pay-report/approve` | `requireAdmin` | Bulk-approve payouts for one official |
| GET | `/api/earnings/mine` | `requireAuth` | Caller's season earnings summary |
| GET | `/health` | public | Health check + Supabase config status |

---

## 3. Vercel Routing Setup

```json
// vercel.json (workspace root)
{
  "buildCommand": "cd webapp && bun install && bun run build",
  "outputDirectory": "webapp/dist",
  "installCommand": "bun install --cwd webapp && bun install --cwd backend",
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)",   "destination": "/api" },
    { "source": "/health",     "destination": "/api" },
    { "source": "/((?!api|health|assets|favicon\\.ico|robots\\.txt|.*\\..*).*)",
      "destination": "/index.html" }
  ]
}
```

**How it works:**

1. **Build** — Vite compiles `webapp/` into `webapp/dist/`. Vercel serves static assets from there.
2. **API traffic** — Any request to `/api/*` or `/health` is rewritten to `api/index.ts`, which uses `hono/vercel`’s `handle(app)` and imports the Hono `app` from `backend/src/index.ts`. Local dev still runs `backend/src/index.ts` directly with Bun.
3. **SPA fallback** — All other non-file paths fall through to `index.html`, enabling React Router v6 client-side navigation.
4. **No `VITE_BACKEND_URL` in production** — The webapp calls `/api/...` with relative URLs, so there is no cross-origin request in production. `VITE_BACKEND_URL` is only needed locally when the backend runs on a different port (3000 vs 8000).

**Required environment variables:**

| Variable | Where set | Required in |
|---|---|---|
| `SUPABASE_URL` | Vercel / Vibecode ENV | Backend |
| `SUPABASE_ANON_KEY` | Vercel / Vibecode ENV | Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel / Vibecode ENV | Backend |
| `VITE_SUPABASE_URL` | Vercel / Vibecode ENV | Frontend build |
| `VITE_SUPABASE_ANON_KEY` | Vercel / Vibecode ENV | Frontend build |
| `VITE_BACKEND_URL` | Local `.env` only | Dev only |

---

## 4. Database Schema

### Tables (run migrations 0001 → 0008 in order)

| Table | Key Columns | Notes |
|---|---|---|
| `certification_levels` | `id`, `name`, `sort_order` | Seeded in 0003 with NB Hockey levels |
| `league_qualifications` | `id`, `league_name`, `minimum_level_id` FK | Maps league → minimum cert level |
| `zones` | `id`, `name`, `sort_order` | 7 NB Hockey zones, added in 0008 |
| `venues` | `id`, `name`, `address`, `lat/lng`, `timezone`, `zone_id` FK | `zone_id` added in 0008 |
| `profiles` | `id`, `user_id`, `email`, `role`, `official_type`, `official_level_id` FK, `distance_km`, `zone_id` FK | Links to `auth.users`; `zone_id` added in 0008 |
| `games` | `id`, `date_time`, `venue_id` FK, `status`, `home_team`, `away_team`, `league_tier`, `league_type`, `game_number` | `league_type` added in 0008 |
| `assignments` | `id`, `game_id` FK, `official_id` FK, `position`, `status`, `cancel_reason`, `payout_approved` | Unique on `(game_id, position)` |
| `availability` | `id`, `official_id` FK, `date`, `morning/afternoon/evening`, `time_slots` JSONB | Unique on `(official_id, date)` |
| `settings` | `key` (PK), `value` JSONB | Stores `pay_rates` config |

### Role Enum

| Value | Access level |
|---|---|
| `ADMIN` | Full access — all admin routes |
| `ASSIGNOR` | Full access — same as ADMIN for scheduling |
| `SUPERVISOR` | Full access — same as ADMIN |
| `FINANCE` | Full access — same as ADMIN (pay report) |
| `OFFICIAL` | Self-service only — `/dashboard/*` routes |

---

## 5. Shared Type Contract

`backend/src/types.ts` is the **single source of truth** for all API data shapes. Both the backend and frontend import from this file. It is never duplicated.

**Key exports:**

```typescript
// Enums
RoleEnum, OfficialTypeEnum, PositionEnum, GameStatusEnum, AssignmentStatusEnum, LeagueTypeEnum

// Table read schemas
ProfileSchema, GameSchema, VenueSchema, AssignmentSchema, AvailabilitySlotSchema
CertificationLevelSchema, LeagueQualificationSchema, LeagueQualificationWithLevelSchema
ZoneSchema, SettingSchema

// Mutation schemas (validated by parseJson() in routes)
ProfileCreateSchema, ProfileUpdateSchema
GameCreateSchema, GameUpdateSchema
VenueCreateSchema, VenueUpdateSchema
AssignmentCreateSchema, AssignmentUpdateSchema
AvailabilityUpsertSchema
CertificationLevelCreateSchema, CertificationLevelUpdateSchema
LeagueQualificationCreateSchema, LeagueQualificationUpdateSchema
ZoneCreateSchema, ZoneUpdateSchema
BulkGameRowSchema, BulkImportPayloadSchema, BulkImportResultSchema

// Finance
PayRateConfigSchema, OfficialPaySummarySchema, PayReportSchema
PayApproveRequestSchema, PayApproveResultSchema, EarningsSummarySchema
```

Frontend imports use the `@shared` path alias:
```typescript
import type { Profile, Game, Assignment } from "@shared/types";
```

---

## 6. Completed Features

### Prompt 1 — Database Foundation & Initial Schema
- Core tables created: `certification_levels`, `league_qualifications`, `venues`, `profiles`, `games`, `assignments`, `settings`
- Row-Level Security policies applied (0002)
- NB Hockey certification levels seeded (0003)
- `set_updated_at()` trigger applied to all tables

### Prompt 2 — Supabase Auth & Role Gateway
- Supabase JWT validation via `Authorization: Bearer` header
- `requireAuth` middleware validates token via `anonClient().auth.getUser()`
- `requireAdmin` checks `profiles.role` against `["ADMIN","ASSIGNOR","SUPERVISOR","FINANCE"]`
- Frontend `useAuth()` hook wraps `supabase.auth` for sign-in / sign-out
- Post-login role detection: fetches `/api/profiles/me`, routes ADMIN roles → `/admin/dashboard`, officials → `/dashboard/schedule`

### Prompt 3 — Universal Login Page
- Split-panel layout: dark branding left (desktop), form right
- Email + password fields wired to `supabase.auth.signInWithPassword()`
- Role-based post-login redirect with loading state
- "Officials Sign In" callout block for first-time users

### Prompt 4 — Admin Command Center Layout
- Desktop: persistent left sidebar with 6 nav items (Dashboard, Schedule, Officials, Import, Finance, Config)
- Mobile: sticky header with hamburger button + shadcn Sheet drawer containing full nav
- `AdminRoute` guard — unauthenticated → `/login`, wrong role → `/dashboard/schedule`
- User email + Sign Out at bottom of sidebar

### Prompt 5 — Official Portal Layout
- Mobile-first design with sticky top bar (logo + name + sign-out)
- Sticky bottom navigation: Schedule · Availability · Profile
- `ProtectedRoute` guard — session-only check, no role restriction
- `pb-24` content padding to clear the bottom nav bar

### Prompt 6 — Schedule Management & Assignment Engine
- Admin schedule page: games grouped by date, status badges, assignment slot buttons
- `ScheduleGameCard` — shows all 5 position slots (REF1/REF2/LINE1/LINE2/SUPERVISOR) with fill state
- `AssignPanel` slide-over — searches officials by name/type, shows availability context
- Auto-transitions game status `UNASSIGNED → ASSIGNED` when first slot is filled
- Official schedule page: PENDING assignments with Accept / Decline buttons, CONFIRMED upcoming list

### Prompt 7 — CSV Game Import
- Drag-and-drop `ImportDropZone` with file type validation
- Client-side `csvParser.ts` — flexible column alias detection, date/time normalization (YYYY-MM-DD, MM/DD/YYYY, 12h/24h)
- `ImportPreviewTable` — shows parsed rows with per-cell error highlighting before submit
- `POST /api/games/bulk` — resolves venue names to UUIDs (auto-creates unknown venues), chunked inserts (100/batch)
- Returns `{ inserted, skipped, errors[] }` with row-level error detail

### Prompt 8 — Officials Roster & Certification Config
- `OfficialsTable` — sortable roster grid: name, type, level, zone, role badge
- `OfficialDrawer` — slide-over form: all profile fields, level selector, role selector
- `AdminConfig` page: `CertificationLevelsPanel` + `LeagueQualificationsPanel`
- Certification levels: ordered list with sort_order, add/delete with confirmation
- League qualifications: maps league name → minimum certification level (enforced at assignment time — **see §7**)

### Prompt 9 — Finance & Pay Report
- `GET /api/pay-report` — aggregates all CONFIRMED assignments per official
- Per-position game fees configurable via `settings.pay_rates` (JSONB) — falls back to defaults (REF1: $75, REF2: $65, LINE1/LINE2: $55, SUPERVISOR: $85)
- Mileage: `distance_km × 2 (round-trip) × cost_per_km ($0.42/km default)`
- `OfficialPayRow` — expandable row: summary totals + per-game line items
- `POST /api/pay-report/approve` — bulk-sets `payout_approved = true` for one official's CONFIRMED assignments
- Official `Profile` page shows personal earnings via `GET /api/earnings/mine`

### Prompt 10 — Official Availability Calendar
- Week-view table grid (Mon–Sun rows × 22 hour columns)
- Hours grouped: Morning (7–11) · Afternoon (12–16) · Evening (17–23, 0)
- Per-period "All" aggregate checkbox + full-day "All" toggle
- Local state with 400ms debounced saves per date (avoids request storms)
- `PUT /api/availability/:date` accepts `{ time_slots: number[] }`, derives `morning/afternoon/evening` booleans automatically
- Today highlighted in yellow; week navigation with prev/next arrows
- Game count badges on each day row (filtered by active zone/league)

### Prompt 11 — Zones & Leagues Provincial System
- `zones` table with 7 seeded New Brunswick Hockey zones (Moncton/Dieppe, Saint John, Fredericton, etc.)
- `zone_id` foreign key added to both `venues` and `profiles`
- `league_type` column added to `games` (`"Minor" | "Senior" | "Adult Rec"`)
- `ZoneLeagueFilter` reusable component: zone dropdown + league type pill toggles + clear button
- Wired into Admin Schedule and Official Availability pages for client-side filtering
- Per-day game count badges in the availability grid update dynamically with filter state

### Synchronization — Shared Type Contract
- Complete audit of `backend/src/types.ts`: all Zod schemas aligned with actual DB columns
- New exports: `LeagueQualificationWithLevelSchema`, `EarningsSummarySchema`, `PayApproveRequestSchema`, `PayApproveResultSchema`
- `GameSchema.league_type` tightened from `z.string()` to `LeagueTypeEnum`
- Inline `z.object()` schemas in route files replaced with named imports from `types.ts`
- Frontend local type duplicates replaced with imports from `@shared/types`

---

## 7. Pending Fine-Tuning Backlog

These tasks are scoped for **Cursor-based fine-tuning** and require surgical edits to existing files rather than structural scaffolding.

---

### 7.1 — Assignment Validation Against `league_qualifications`

**What:** When an admin creates an assignment via `POST /api/assignments`, enforce that the assigned official's `official_level_id` meets the minimum certification level defined in `league_qualifications` for the game's `league_type`.

**Where to edit:** `backend/src/routes/assignments.ts` — inside the `POST /` handler, after `parseJson()` and before the Supabase insert.

**Logic to implement:**
```typescript
// 1. Fetch the game to get its league_type
// 2. Look up league_qualifications WHERE league_name = game.league_type
// 3. Fetch the official's profile to get official_level_id
// 4. Compare certification_levels.sort_order:
//    official_level.sort_order >= minimum_level.sort_order  → allow
//    otherwise → return 422 UNPROCESSABLE_ENTITY with clear message
```

**Schema already in place:** `LeagueQualificationSchema`, `CertificationLevelSchema` in `types.ts`.

**Frontend touch:** `AssignPanel.tsx` — surface the 422 error message to the admin so they understand why an official can't be assigned.

---

### 7.2 — Free-Text Messaging Modals via Resend

**What:** Allow admins to send custom email notifications to individual officials or all officials in a zone. Use cases: game cancellations, schedule reminders, general announcements.

**Backend work:**
- Install `resend` package: `bun add resend`
- Add `RESEND_API_KEY` to env vars (`backend/src/env.ts`)
- Create `backend/src/routes/messages.ts` with `POST /api/messages/send`
- Payload: `{ to: string | "zone:{zoneId}", subject: string, body: string }`
- Resolve `"zone:{zoneId}"` to a list of official emails from `profiles`

**Frontend work:**
- Create `webapp/src/features/messaging/MessageModal.tsx` — shadcn Dialog with `subject` + `body` textarea + recipient selector (individual official or zone)
- Wire into `admin/Officials.tsx` (per-official "Message" button) and `admin/Dashboard.tsx` (bulk "Notify Zone" quick action)

**Schema to add in `types.ts`:**
```typescript
export const MessageSendSchema = z.object({
  to: z.union([z.string().email(), z.string().startsWith("zone:")]),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});
```

---

### 7.3 — Localized CSS Theming for New Brunswick

**What:** Replace the current neutral shadcn/ui theme with a branded New Brunswick Hockey visual identity — official colours, typography, and province-specific layout touches.

**Where to edit:**
- `webapp/src/index.css` — update CSS custom properties (`--primary`, `--secondary`, `--accent`, `--background`, etc.) under `:root` and `.dark`
- `webapp/tailwind.config.ts` — extend `colors` with named brand tokens (e.g., `nb-navy`, `nb-gold`, `nb-ice`)
- `webapp/index.html` — update `<title>`, `og:title`, `og:description`, `og:image` meta tags
- `webapp/src/components/layout/AdminLayout.tsx` — apply brand header/sidebar colours
- `webapp/src/components/layout/DashboardLayout.tsx` — apply brand bottom nav colours

**Suggested palette (NB Hockey):**
- Primary: Navy blue `#002147`
- Accent: Gold `#C8952A`
- Background ice: Off-white `#F5F7FA`
- Dark mode background: `#0D1117`

**Typography:** Consider loading a condensed sports-style font (e.g., Barlow Condensed or DIN Condensed) via Google Fonts in `webapp/index.html`.

---

## 8. Development Workflow

### Running locally

```bash
# Terminal 1 — Backend (port 3000)
cd backend && bun run dev

# Terminal 2 — Frontend (port 8000)
cd webapp && bun run dev
```

### Running migrations

Open the Supabase SQL Editor and run files in order:
```
0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008
```

Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

### Deploying to Vercel

```bash
# From workspace root
vercel --prod
```

Set the environment variables in the Vercel dashboard under **Settings → Environment Variables** before first deploy.

---

*End of HANDOFF_BLUEPRINT.md*
