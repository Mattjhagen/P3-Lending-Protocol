# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

P3 Lending Protocol is a peer-to-peer lending marketplace with three npm packages:

| Package | Path | Description |
|---|---|---|
| Frontend (Vite + React) | `/workspace/` (root) | SPA on port 5173 |
| Backend (Express) | `/workspace/server/` | REST API on port 5000 |
| Smart Contracts (Hardhat) | `/workspace/contracts/` | Solidity contracts |

### Environment variables

A single `/workspace/.env` file is read by both frontend (Vite `VITE_*` vars) and backend (via dotenv path resolution in `server/src/config/env.ts`). At minimum you need:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend — validated by `envalid`; must be a valid URL format)

Placeholder values (e.g. `https://placeholder.supabase.co`) satisfy the validators for local development without a live Supabase instance.

### Running services

- **Frontend:** `npm run dev` (or `npx vite --host 0.0.0.0`) — port 5173
- **Backend:** `npm --prefix server run dev` — port 5000 (uses `ts-node-dev --respawn`)
- Backend requires `pino-pretty` as a devDependency (already added); without it, the dev server crashes on startup.

### Lint, test, build commands

See `package.json` scripts and `Justfile` for the canonical commands. Key ones:

- **Frontend lint:** `npm run lint` (runs `tsc --noEmit`). Note: pre-existing TS errors exist in `client-services/backendService.ts` (corrupted file with shell commands pasted at top).
- **Backend typecheck:** `npm --prefix server run build` (runs `tsc`)
- **Frontend tests:** `npm run test` (vitest)
- **Backend tests:** `npm --prefix server run test` (vitest)
- **Contract tests:** `npm --prefix contracts test` (hardhat test)
- **E2E tests:** `npm run e2e` (Playwright; requires `npx playwright install chromium` first)
- **Full CI:** `npm run ci` or `just ci`

### Gotchas

- The root `package.json` specifies `"engines": {"node": "18.x"}` but CI uses Node 22 and everything works fine on 22.
- The backend reads `.env` from multiple paths (see `server/src/config/env.ts`); the root `.env` file is sufficient for both frontend and backend.
- `client-services/backendService.ts` has corrupted content (shell commands at top of file) causing frontend typecheck failures — this is a pre-existing repo issue.
