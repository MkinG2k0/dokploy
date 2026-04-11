# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Monorepo full-stack control plane — Next.js (Pages Router) embedded in a custom Node `http` server, with shared domain logic in `@dokploy/server`, optional sidecar HTTP services for async jobs, and a separate Go monitoring agent.

**Key Characteristics:**
- Single primary deployable: `apps/dokploy` bundles UI, tRPC API, Better Auth, BullMQ deployment worker, and WebSocket upgrades on one process.
- Domain and persistence live in `packages/server` and are consumed by the app and by `apps/api` / `apps/schedules`.
- API surface split: type-safe RPC (`/api/trpc`), OpenAPI bridge (`/api/[...trpc]`), REST-ish webhooks under `src/pages/api/`, and Hono microservices for Inngest deployments and scheduled backup jobs.

## Layers

**Presentation (Next.js Pages + components):**
- Purpose: Routes, layouts, dashboards, forms, and client data fetching.
- Location: `apps/dokploy/src/pages/`, `apps/dokploy/src/components/`
- Contains: Page components, feature UI (`dashboard/`, `onboarding/`, `billing/`), Radix-based `ui/` primitives, proprietary enterprise UI under `components/proprietary/`.
- Depends on: tRPC React client (`apps/dokploy/src/utils/api.ts`), i18n (`apps/dokploy/src/i18n/`), shared styles `apps/dokploy/src/styles/`.
- Used by: End users in the browser.

**HTTP / API boundary (Next API routes):**
- Purpose: Wire external HTTP to handlers; no heavy business rules here beyond auth checks.
- Location: `apps/dokploy/src/pages/api/`
- Contains: `trpc/[trpc].ts` (tRPC adapter), `[...trpc].ts` (OpenAPI handler via `@dokploy/trpc-openapi`), `auth/[...all].ts` (Better Auth), deploy refresh tokens, provider OAuth callbacks, health.
- Depends on: `appRouter` and `createTRPCContext` from `apps/dokploy/src/server/api/`, `validateRequest` / `auth` from `@dokploy/server`.
- Used by: Browser, webhooks, external callers.

**tRPC application layer:**
- Purpose: Typed procedures, authorization middleware, orchestration calling services and DB.
- Location: `apps/dokploy/src/server/api/trpc.ts`, `apps/dokploy/src/server/api/root.ts`, `apps/dokploy/src/server/api/routers/**/*.ts`, helpers e.g. `apps/dokploy/src/server/api/utils/`
- Contains: Router composition, `publicProcedure` / `protectedProcedure` / `adminProcedure` / `enterpriseProcedure`, `withPermission` factory, per-domain routers (project, deployment, docker, etc.).
- Depends on: `@dokploy/server` services, permission checks (`packages/server/src/services/permission.ts`), schema types from `apps/dokploy/src/server/db/schema` (re-export of server schema), shared `db` from context (`packages/server` in `createTRPCContext` via `@dokploy/server/db`).
- Used by: `createTRPCNext` client and OpenAPI adapter.

**Domain & infrastructure (`@dokploy/server`):**
- Purpose: Business logic, Docker/Traefik/git integrations, billing helpers, setup, cron initialization exports used by the host process.
- Location: `packages/server/src/` — notably `services/`, `utils/`, `setup/`, `jobs/`, `billing/`, `lib/auth.ts`, `lib/logger.ts`
- Contains: Service modules per aggregate (e.g. `packages/server/src/services/deployment.ts`), provider utilities, Traefik/Docker builders, email templates under `packages/server/src/emails/`.
- Depends on: Drizzle schema and DB (`packages/server/src/db/`), external SDKs (Octokit, dockerode, ssh2, etc.).
- Used by: tRPC routers, `apps/dokploy/src/server/server.ts`, workers, `apps/api`, `apps/schedules`.

**Data access:**
- Purpose: PostgreSQL via Drizzle ORM; schema as single source of truth in the server package.
- Location: `packages/server/src/db/schema/*.ts`, `packages/server/src/db/index.ts`
- Contains: Table definitions, relations; app re-exports via `apps/dokploy/src/server/db/schema/index.ts`.
- Depends on: `postgres` driver, connection URL from server DB constants (env present at runtime — not documented here).
- Used by: Services, tRPC procedures, migrations run from `apps/dokploy` (Drizzle config under `apps/dokploy/src/server/db/drizzle.config.ts`).

**Process / runtime host:**
- Purpose: Start Next, attach WebSockets, run background initialization and workers when not cloud.
- Location: `apps/dokploy/src/server/server.ts`, `apps/dokploy/src/server/wss/*.ts`, `apps/dokploy/src/server/queues/deployments-queue.ts`
- Contains: `next({ dev })` + `http.createServer`, BullMQ deployment worker, imports `initCronJobs`, `initSchedules`, Traefik setup from `@dokploy/server`.
- Depends on: `@dokploy/server` setup exports, queue/redis config in app server folder.
- Used by: `pnpm run dev` / production `start` script in `apps/dokploy/package.json`.

**Sidecar services:**
- Purpose: Isolate long-running or externally orchestrated work from the main Next process.
- **Deployments API:** `apps/api/src/index.ts` — Hono + Inngest function for `deployment/requested` events, calls `deploy` pipeline in local modules; uses `@dokploy/server` for deployment execution.
- **Schedules service:** `apps/schedules/src/index.ts` — Hono API key middleware, BullMQ job scheduling for backups/schedules/volume-backup; workers in `apps/schedules/src/workers.ts`.

**Monitoring agent (Go):**
- Purpose: Separate binary for container/server metrics (not TypeScript stack).
- Location: `apps/monitoring/main.go` and subpackages under `apps/monitoring/`.

## Data Flow

**Authenticated dashboard action (tRPC mutation):**

1. User interacts with a page under `apps/dokploy/src/pages/dashboard/...`.
2. Component calls `api.*` from `apps/dokploy/src/utils/api.ts` (TRPC Next + React Query, `superjson`).
3. HTTP POST to `/api/trpc` handled by `apps/dokploy/src/pages/api/trpc/[trpc].ts` → `createNextApiHandler` with `appRouter` and `createTRPCContext`.
4. `createTRPCContext` (`apps/dokploy/src/server/api/trpc.ts`) calls `validateRequest(req)` from `packages/server/src/lib/auth.ts`, attaches `session`, `user`, `db`, `req`, `res`.
5. Procedure middleware runs (`protectedProcedure`, optional `withPermission` → `checkPermission` in `packages/server/src/services/permission.ts`).
6. Router handler invokes functions from `@dokploy/server` and/or Drizzle queries; schema tables imported from `@/server/db/schema` (re-export).
7. Response serialized with `superjson` back to the client; React Query cache updates.

**OpenAPI / external REST over tRPC:**

1. Authenticated request hits `apps/dokploy/src/pages/api/[...trpc].ts`.
2. Handler ensures session via `validateRequest`, then `createOpenApiNextHandler` from `@dokploy/trpc-openapi` with same `appRouter` and context factory.

**Sign-in / session:**

1. Client hits Better Auth routes under `apps/dokploy/src/pages/api/auth/[...all].ts` → `auth.handler` from `packages/server` export `auth`.

**Deployment worker (self-hosted):**

1. After HTTP server listen in `apps/dokploy/src/server/server.ts`, non-cloud path imports and runs `deploymentWorker` from `apps/dokploy/src/server/queues/deployments-queue.ts`.
2. Worker processes BullMQ jobs and calls `deployApplication`, `deployCompose`, etc. from `@dokploy/server`.

**Inngest-based deployment (optional deployment service):**

1. External or internal trigger sends Inngest event; `apps/api/src/index.ts` function runs `deploy(jobData)` and emits completion/failure events.

**State Management:**
- Server state: PostgreSQL via Drizzle; Redis for BullMQ (queues) where configured in app server modules.
- Client state: TanStack React Query via tRPC adapter; local UI state in components; theme via `next-themes` in `apps/dokploy/src/pages/_app.tsx`.

## Key Abstractions

**`appRouter`:**
- Purpose: Single merged tRPC router for the whole product API.
- Examples: `apps/dokploy/src/server/api/root.ts`
- Pattern: `createTRPCRouter({ ... })` with nested domain routers.

**Procedure middleware chain:**
- Purpose: Enforce auth, roles, enterprise license, and fine-grained permissions.
- Examples: `protectedProcedure`, `enterpriseProcedure`, `withPermission` in `apps/dokploy/src/server/api/trpc.ts`
- Pattern: tRPC `.use()` composition on `initTRPC` instance.

**Service module:**
- Purpose: Encapsulate domain operations (deploy, backup, domain DNS, registry, etc.) callable from routers, workers, and sidecars.
- Examples: `packages/server/src/services/deployment.ts`, `packages/server/src/services/docker.ts`
- Pattern: Plain async functions and exports from `packages/server/src/index.ts` barrel.

**Drizzle schema module:**
- Purpose: Type-safe tables and Zod/API shapes shared app-wide.
- Examples: `packages/server/src/db/schema/project.ts`; consumed through `apps/dokploy/src/server/db/schema/index.ts`
- Pattern: Central schema in server package; app may duplicate DB connection wrapper in `apps/dokploy/src/server/db/index.ts` for tooling/migrations co-location.

**Host process bootstrap:**
- Purpose: One place for Next prep, Traefik defaults, cron/schedules, WebSockets, worker start.
- Examples: `apps/dokploy/src/server/server.ts`
- Pattern: Async IIFE after `app.prepare()`.

## Entry Points

**Primary web + API process:**
- Location: `apps/dokploy/src/server/server.ts`
- Triggers: `pnpm run dev` / `node ... dist/server.mjs` (see `apps/dokploy/package.json`)
- Responsibilities: `dotenv` load, optional dev migrations, Next prepare, HTTP server, WebSocket setup, production init from `@dokploy/server`, BullMQ worker when not cloud.

**Next.js page routing:**
- Location: `apps/dokploy/src/pages/_app.tsx`, `apps/dokploy/src/pages/_document.tsx`, file-based routes under `apps/dokploy/src/pages/`
- Triggers: HTTP requests handled by Next request handler from the custom server (or standalone Next in other modes if used).
- Responsibilities: Global providers (intl, theme, tRPC provider), fonts, layout hooks per page.

**tRPC HTTP:**
- Location: `apps/dokploy/src/pages/api/trpc/[trpc].ts`
- Triggers: Client batch/link calls to `/api/trpc`
- Responsibilities: Adapter wiring, dev error logging.

**Deployments microservice:**
- Location: `apps/api/src/index.ts`
- Triggers: `pnpm --filter=@dokploy/api run dev` / `start`
- Responsibilities: Hono server, Inngest serve endpoint, deployment function.

**Schedules microservice:**
- Location: `apps/schedules/src/index.ts`
- Triggers: `pnpm --filter=@dokploy/schedules run dev` / `start`
- Responsibilities: Authenticated Hono routes for backup/schedule jobs, BullMQ workers.

**Go monitoring:**
- Location: `apps/monitoring/main.go`
- Triggers: Go build/run per `apps/monitoring/README.md`
- Responsibilities: Metrics collection for containers/servers.

## Error Handling

**Strategy:** tRPC `TRPCError` for API failures with optional Zod flattening in `errorFormatter`; service layer throws or returns errors consumed by routers; sidecars use try/catch with structured logging and HTTP JSON errors.

**Patterns:**
- Validation: Zod `.input()` on procedures; `@hono/zod-validator` in `apps/api` and `apps/schedules`.
- API errors: `errorFormatter` attaches `zodError` in `apps/dokploy/src/server/api/trpc.ts`.
- Top-level server: `try/catch` in `apps/dokploy/src/server/server.ts` logs `Main Server Error`.

## Cross-Cutting Concerns

**Logging:**
- `pino` / `pino-pretty` in dependencies; `packages/server/src/lib/logger.ts`; sidecars use local `logger` modules (`apps/api/src/logger.js`, `apps/schedules/src/logger.js`).

**Validation:**
- Zod at API boundaries (tRPC input, Hono validators); Drizzle-Zod where used for schema-derived types.

**Authentication:**
- Better Auth: handler at `apps/dokploy/src/pages/api/auth/[...all].ts`, session validation via `validateRequest` in tRPC context (`packages/server/src/lib/auth.ts`).

**Authorization:**
- Role-based and permission-based: `checkPermission`, `checkProjectAccess`, etc. in `packages/server/src/services/permission.ts`; enterprise license gate via `hasValidLicense` and `enterpriseProcedure`.

---

*Architecture analysis: 2026-04-11*
