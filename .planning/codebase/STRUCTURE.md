# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```
dokploy/                          # Monorepo root (pnpm workspaces)
├── apps/                         # Runnable applications and agents
│   ├── api/                      # Hono + Inngest deployment service (@dokploy/api)
│   ├── dokploy/                  # Main Next.js app + embedded Node server + workers
│   ├── monitoring/               # Go monitoring agent (separate from TS workspace packages)
│   └── schedules/                # Hono + BullMQ schedules/backup API (@dokploy/schedules)
├── packages/
│   └── server/                   # @dokploy/server — domain logic, DB schema, auth, setup exports
├── docs/                         # Project documentation
├── patches/                      # pnpm patch files (if any)
├── .github/                      # CI and GitHub metadata
├── biome.json                    # Lint/format (Biome)
├── package.json                  # Root scripts and workspace definition
├── pnpm-workspace.yaml           # Workspace globs: apps/*, packages/*
├── openapi.json                  # Generated or checked-in OpenAPI artifact (root)
├── Dockerfile*                   # Container build variants
└── README.md                     # Top-level readme
```

## Directory Purposes

**`apps/dokploy/`:**
- Purpose: Primary product — UI, API routes, custom server, queues, WebSockets, migrations tooling.
- Contains: `src/pages/` (Pages Router), `src/components/`, `src/server/` (API + process host), `src/utils/`, `src/i18n/`, `src/styles/`, `docker/`, `esbuild.config.ts`, `next.config.mjs`, `tailwind.config.ts`.
- Key files: `apps/dokploy/src/server/server.ts`, `apps/dokploy/src/server/api/root.ts`, `apps/dokploy/src/server/api/trpc.ts`, `apps/dokploy/src/utils/api.ts`, `apps/dokploy/src/pages/_app.tsx`, `apps/dokploy/package.json`.
- Subdirectories: `src/server/api/routers/` (one file or folder per domain router), `src/server/wss/` (WebSocket handlers), `src/server/queues/` (BullMQ), `src/server/db/` (Drizzle config, migrations entry, schema re-export).

**`packages/server/`:**
- Purpose: Shared backend library — services, DB schema, auth instance, setup/cron helpers, utilities.
- Contains: `src/services/`, `src/db/schema/`, `src/utils/`, `src/setup/`, `src/lib/`, `src/jobs/`, `src/billing/`, `src/emails/`, `src/constants/`.
- Key files: `packages/server/src/index.ts` (barrel exports), `packages/server/src/db/index.ts`, `packages/server/package.json` (subpath exports: `.`, `./db`, `./constants`, `./setup/*`).
- Subdirectories: Large flat service layer with domain-named files; `db/schema/` split per table/domain.

**`apps/api/`:**
- Purpose: Standalone HTTP service for Inngest-driven deployments.
- Contains: `src/index.ts`, `src/schema.ts`, `src/service.ts`, `src/utils.ts`, `src/logger.ts`.
- Key files: `apps/api/package.json`, `apps/api/src/index.ts`.

**`apps/schedules/`:**
- Purpose: Standalone HTTP service for creating/updating/removing scheduled backup jobs; BullMQ workers.
- Contains: `src/index.ts`, `src/queue.ts`, `src/workers.ts`, `src/schema.ts`, `src/utils.ts`.
- Key files: `apps/schedules/package.json`, `apps/schedules/src/index.ts`.

**`apps/monitoring/`:**
- Purpose: Go binary for monitoring (not part of Node workspace packages).
- Contains: `main.go`, `containers/`, `config/`, `database/`, `middleware/`, `monitoring/`, `go.mod`.

**`docs/`:**
- Purpose: User- and contributor-facing documentation outside the app tree.

**`.planning/`:**
- Purpose: GSD / planning artifacts (this folder includes `codebase/` mapping outputs).

## Key File Locations

**Entry Points:**
- `apps/dokploy/src/server/server.ts` — Custom server: Next + HTTP + WebSockets + worker startup.
- `apps/dokploy/src/pages/_app.tsx` — Next.js app shell and global providers.
- `apps/api/src/index.ts` — Hono + Inngest serve.
- `apps/schedules/src/index.ts` — Hono API for job control + worker registration.
- `apps/monitoring/main.go` — Go monitoring entry.

**Configuration:**
- `package.json` (root) — workspace scripts: `dokploy:dev`, `typecheck`, `build`, Biome.
- `apps/dokploy/package.json` — app scripts: `dev`, `build`, `start`, Drizzle, tests.
- `apps/dokploy/next.config.mjs` — Next configuration.
- `apps/dokploy/tsconfig.json` — Path aliases `@/*`, `@dokploy/server`.
- `packages/server/tsconfig.server.json` — Server package build typing.
- `biome.json` — Formatter/linter for the repo.
- `.env` (present at runtime for local/prod) — not read or quoted in repo docs; required variables are implied by code (database URL, auth secrets, API keys for sidecars).

**Core Logic:**
- `apps/dokploy/src/server/api/root.ts` — tRPC router aggregation.
- `apps/dokploy/src/server/api/routers/*.ts` — Domain tRPC routers.
- `packages/server/src/services/*.ts` — Domain services consumed across apps.
- `packages/server/src/db/schema/*.ts` — Drizzle models.

**API Routes (Next):**
- `apps/dokploy/src/pages/api/trpc/[trpc].ts` — tRPC handler.
- `apps/dokploy/src/pages/api/[...trpc].ts` — OpenAPI handler.
- `apps/dokploy/src/pages/api/auth/[...all].ts` — Better Auth.
- `apps/dokploy/src/pages/api/deploy/`, `apps/dokploy/src/pages/api/providers/`, `apps/dokploy/src/pages/api/webhooks/` — Integrations and deploy hooks.

**Testing:**
- `apps/dokploy/src/__test__/` — Vitest config and tests (see `apps/dokploy/package.json` script `test`).

**i18n:**
- `apps/dokploy/src/i18n/` — Locale resolution, messages, context used in `_app.tsx`.

## Naming Conventions

**Files:**
- `kebab-case.tsx` / `kebab-case.ts`: Most React modules and utilities (e.g. `onboarding-step-repository.tsx`, `search-command.tsx`).
- `PascalCase.tsx`: Some components (e.g. `PaymentHistorySection.tsx` under `components/billing/`) — mixed legacy; new UI often follows kebab-case filenames with PascalCase export inside.
- `[param].tsx` / `[...catchall].ts`: Next.js dynamic and catch-all routes under `src/pages/`.
- `router` modules: `*-router` or domain name only, e.g. `project.ts` exporting `projectRouter` in `src/server/api/routers/`.

**Directories:**
- `dashboard/`, `settings/`, `proprietary/`: Feature grouping under `src/components/`.
- `ui/`: Shared primitives (shadcn/Radix style).
- Domain folders under `packages/server/src/services/` match aggregate names (`deployment.ts`, `docker.ts`).

**Special Patterns:**
- Barrel re-exports: `packages/server/src/index.ts` exports most public server API; `apps/dokploy/src/server/db/schema/index.ts` re-exports `@dokploy/server/db/schema`.
- `proprietary/`: Enterprise-only UI and routers (`apps/dokploy/src/server/api/routers/proprietary/`, `apps/dokploy/src/components/proprietary/`).

## Where to Add New Code

**New tRPC domain surface:**
- Router: `apps/dokploy/src/server/api/routers/{domain}.ts` exporting `{domain}Router`.
- Registration: add import and key to `createTRPCRouter` in `apps/dokploy/src/server/api/root.ts`.
- Business logic: prefer new or extended functions in `packages/server/src/services/{domain}.ts` (or new file) rather than large handlers in the router.

**New dashboard page:**
- Page file: `apps/dokploy/src/pages/dashboard/.../*.tsx` (or nested dynamic segments mirroring existing project/environment/services layout).
- UI pieces: `apps/dokploy/src/components/dashboard/...` co-located by feature.

**New DB table / migration:**
- Schema: add or extend `packages/server/src/db/schema/{entity}.ts` and export from `packages/server/src/db/schema` index if required by convention.
- Migrations: generated/run via Drizzle scripts in `apps/dokploy/package.json` using `apps/dokploy/src/server/db/drizzle.config.ts`.

**New integration webhook or public HTTP handler:**
- Prefer `apps/dokploy/src/pages/api/{integration}/...ts` following existing deploy and provider patterns.

**New sidecar HTTP service:**
- New package under `apps/{name}/` with `package.json`, `src/index.ts`, and workspace entry if it must be part of `pnpm-workspace.yaml` globs (already `apps/*`).

**Shared utility used by multiple apps:**
- Add to `packages/server/src/utils/` or `packages/server/src/services/` and export from `packages/server/src/index.ts` when it must be public.

## Special Directories

**`apps/dokploy/.next/`:**
- Purpose: Next.js build output and cache.
- Generated: Yes.
- Committed: No (typically gitignored).

**`node_modules/`:**
- Purpose: Installed dependencies.
- Committed: No.

**`patches/`:**
- Purpose: pnpm dependency patches referenced from root `package.json` when used.

**`apps/monitoring/`:**
- Purpose: Go module; built with Go toolchain, not `pnpm build` from root unless scripted separately.

---

*Structure analysis: 2026-04-11*
