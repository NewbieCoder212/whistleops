# Vercel API functions

- **`index.js`** — Bundled output of `backend/src/vercel-entry.ts`. Regenerate with `bun run build:vercel` in `backend/`. Commit after backend API changes.
- **`health.js`** — Re-exports `index.js` for `/health` and `/api/health`.

Do not replace this layout with `api/[[...path]].js` only — nested routes like `/api/profiles/me` will 404.

See **`docs/VERCEL_DEPLOY.md`** for routing, env vars, and WebSocket requirements.
