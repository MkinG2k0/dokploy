# Codebase Concerns

**Analysis Date:** 2026-04-11

## Tech Debt

**Monolithic UI modules (maintainability / review risk):**
- Issue: Several screens and settings flows exceed typical component size limits and mix many concerns in one file.
- Why: Incremental feature growth without splitting along domain boundaries.
- Impact: Harder refactors, higher regression risk, slower code review.
- Fix approach: Extract subcomponents and hooks along domain lines (e.g. notifications by channel, environment page by service type); align with project FSD rules where applicable.
- Files: `apps/dokploy/src/components/dashboard/settings/notifications/handle-notifications.tsx` (~1916 lines), `apps/dokploy/src/pages/dashboard/project/[projectId]/environment/[environmentId].tsx` (~1731 lines), `apps/dokploy/src/components/proprietary/roles/manage-custom-roles.tsx` (~1027 lines).

**Oversized tRPC routers:**
- Issue: Core routers hold large numbers of procedures in single files.
- Impact: Merge conflicts, difficult navigation, easy to miss permission or validation consistency when adding endpoints.
- Fix approach: Split routers by subdomain (e.g. application lifecycle vs domains vs backups) and re-export from `apps/dokploy/src/server/api/root.ts` (or equivalent aggregator).
- Files: `apps/dokploy/src/server/api/routers/application.ts` (~1031 lines), `apps/dokploy/src/server/api/routers/settings.ts` (~1020 lines), `apps/dokploy/src/server/api/routers/compose.ts` (~998 lines), `apps/dokploy/src/server/api/routers/project.ts` (~959 lines), `apps/dokploy/src/server/api/routers/notification.ts` (~942 lines).

**Type-safety bypasses (`@ts-ignore`, file-level eslint-disable, `as any`):**
- Issue: Widespread suppression instead of narrowing or proper typings.
- Impact: Refactors do not surface type errors; runtime-only failures.
- Fix approach: Replace with discriminated unions, branded types, or generated types; for Traefik JSON-schema types, regenerate or scope eslint-disable to generated files only.
- Files (sample): `apps/dokploy/src/server/api/trpc.ts`, `apps/dokploy/src/server/wss/terminal.ts`, `apps/dokploy/src/server/wss/docker-container-terminal.ts`, `packages/server/src/services/compose.ts`, `packages/server/src/utils/traefik/types.ts`, `packages/server/src/utils/traefik/file-types.ts`, `apps/dokploy/src/components/dashboard/monitoring/free/container/docker-cpu-chart.tsx`, `apps/dokploy/src/server/api/trpc.ts` (`withPermission` uses `as any` on permission payload).

**Workspace dependency skew for `drizzle-zod`:**
- Issue: `apps/dokploy` declares `drizzle-zod` `0.8.3` while `packages/server` uses `0.5.1`.
- Impact: Subtle schema/Zod inference differences across package boundary; duplicate resolution or unexpected behavior in monorepo installs.
- Fix approach: Align versions via pnpm overrides or bump `@dokploy/server` to match the app and re-verify migrations and zod schemas.
- Files: `apps/dokploy/package.json`, `packages/server/package.json`.

**Stale inline TODO (bulk move):**
- Issue: Comment references updating move APIs to `targetEnvironmentId` instead of `targetProjectId`, while call sites already pass `targetEnvironmentId`.
- Impact: Misleading for future contributors; may hide a remaining API inconsistency elsewhere.
- Fix approach: Audit move mutations in `apps/dokploy/src/server/api/routers/*.ts`, update comment or remove; add integration test for cross-environment moves if missing.
- Files: `apps/dokploy/src/pages/dashboard/project/[projectId]/environment/[environmentId].tsx` (around bulk move handler).

**Proprietary billing placeholders:**
- Issue: Comments indicate unfinished integration for custom subscription/licensing in enterprise flows.
- Impact: Enterprise gating and license flows may not match product intent until completed.
- Fix approach: Implement or remove TODOs after product decision.
- Files: `apps/dokploy/src/server/api/routers/proprietary/license-key.ts`, `apps/dokploy/src/components/proprietary/enterprise-feature-gate.tsx`.

## Known Bugs

**No in-repo reproduction tickets captured:**
- Symptoms: No dedicated `BUG.md` or issue-linked comments found during scan beyond TODOs above.
- Trigger: Not applicable.
- Workaround: Track confirmed defects in issue tracker and link from this file when verified.
- Root cause: Not established from static analysis alone.

## Security Considerations

**Server-side request forgery (SSRF) via public compose templates query:**
- Risk: `compose.templates` is a `publicProcedure` and forwards `baseUrl` to `fetchTemplatesList`, which performs `fetch(\`${baseUrl}/meta.json\`)` with no host allowlist. Unauthenticated callers can induce the Dokploy server to request arbitrary URLs (metadata leak, internal network probing, abuse of server egress).
- Current mitigation: None visible in `fetchTemplatesList` (no URL validation).
- Recommendations: Remove `baseUrl` from the public procedure, hardcode or env-configure the template CDN, or enforce an allowlist of hosts; require auth for configurable base URLs. Code: `apps/dokploy/src/server/api/routers/compose.ts` (`templates`), `packages/server/src/templates/github.ts` (`fetchTemplatesList`).

**HTML injection surface in container log rendering:**
- Risk: Log lines are passed through `fancy-ansi` and rendered with `dangerouslySetInnerHTML`. Malicious or crafted container output could inject HTML/JS in the operator’s browser (stored XSS in the UI session).
- Current mitigation: ANSI-to-HTML conversion only; no documented HTML sanitization step.
- Recommendations: Sanitize HTML output (e.g. DOMPurify) or render via a safe ANSI layer without raw HTML; treat logs as untrusted.
- Files: `apps/dokploy/src/components/dashboard/docker/logs/terminal-line.tsx`.

**Public metrics notification ingestion:**
- Risk: `notification.receiveNotification` is public but gated by a shared secret token in settings/remote server config. Weak or leaked tokens allow spoofed threshold alerts.
- Current mitigation: Token comparison against stored metrics config (`apps/dokploy/src/server/api/routers/notification.ts`).
- Recommendations: Document token rotation, rate limiting, and constant-time comparison if not already; monitor for brute force on tRPC batching.

**Error logging via `console.log` in API paths:**
- Risk: Errors may leak structure or internals to stdout in production logs.
- Current mitigation: Partial use of structured logging (`packages/server/src/lib/logger.ts`) elsewhere.
- Recommendations: Route API errors through centralized logger with redaction; replace ad-hoc `console.log` in routers.
- Files (sample): `apps/dokploy/src/server/api/routers/notification.ts`, `apps/dokploy/src/server/api/routers/user.ts`, `apps/dokploy/src/pages/api/deploy/[refreshToken].ts`.

## Performance Bottlenecks

**Large client bundles and pages:**
- Problem: Very large TSX modules increase parse and hydration cost on dashboard routes.
- Measurement: Not captured in repository (no perf budgets or Lighthouse CI artifacts found).
- Cause: Monolithic components and wide import graphs.
- Improvement path: Code-splitting, lazy routes, and decomposition of `handle-notifications.tsx` and `[environmentId].tsx`.
- Files: Same as monolithic UI list above.

**Heavy server utilities:**
- Problem: Docker helper module is large and likely called on hot paths (deploy, health, exec).
- Measurement: Not profiled in-repo.
- Cause: Concentrated logic in single modules.
- Improvement path: Profile production workloads; extract cold paths; cache Docker API responses where safe.
- Files: `packages/server/src/utils/docker/utils.ts` (~816 lines), `packages/server/src/utils/docker/types.ts` (~878 lines).

## Fragile Areas

**WebSocket terminal and Docker log streaming:**
- Why fragile: Async streams, `node-pty`, Docker attach, and multiple `@ts-ignore` / `no-misused-promises` suppressions.
- Common failures: Connection drops, backpressure, race on close, terminal resize edge cases.
- Safe modification: Add integration tests around reconnect and cancellation; minimize changes without E2E verification.
- Test coverage: Limited dedicated tests under `apps/dokploy/src/__test__/wss/`; no full terminal E2E in Vitest suite.
- Files: `apps/dokploy/src/server/wss/terminal.ts`, `apps/dokploy/src/server/wss/docker-container-logs.ts`, `apps/dokploy/src/server/wss/docker-container-terminal.ts`, `apps/dokploy/src/server/wss/listen-deployment.ts`.

**Permission middleware typing:**
- Why fragile: `withPermission` casts permission object with `as any`, hiding mismatches between `statements` and runtime checks.
- Common failures: Silent authorization gaps when resources/actions are renamed.
- Safe modification: Type `checkPermission` input from `statements` without assertion; add compile-time tests for each resource key.
- Test coverage: Permission unit tests exist (`apps/dokploy/src/__test__/permissions/`) but middleware typing is not enforced by compiler.
- Files: `apps/dokploy/src/server/api/trpc.ts`, `packages/server/src/services/permission.ts` (called from middleware).

**Generated Traefik typings:**
- Why fragile: Entire files disable ESLint; manual edits are easy to overwrite if regenerated.
- Common failures: Drift between runtime Traefik config and types.
- Safe modification: Treat as generated artifacts; automate regeneration from schema; avoid hand-edits except generator output.
- Files: `packages/server/src/utils/traefik/types.ts`, `packages/server/src/utils/traefik/file-types.ts`.

## Scaling Limits

**Single-control-plane deployment model:**
- Current capacity: Depends on host CPU, Docker daemon, and queue workers; not numerically documented in code.
- Limit: Long-running deployments, many concurrent WebSocket log sessions, and BullMQ depth can saturate one node.
- Symptoms at limit: Slow UI, queued jobs, timeouts on `packages/server/src/services/deployment.ts` paths.
- Scaling path: Horizontal workers for queues, dedicated log/metrics egress, larger instances; review `apps/dokploy/src/server/queues/queueSetup.ts` and Redis/BullMQ config operationally.

## Dependencies at Risk

**Tight coupling to Docker / SSH / `node-pty`:**
- Risk: Native modules (`ssh2`, `node-pty`, `better-sqlite3` in root overrides) complicate upgrades and cross-platform builds.
- Impact: Failed installs or runtime ABI mismatches after Node major bumps (`engines` require Node `^24.4.0`).
- Migration plan: Pin and test upgrades in CI; keep `pnpm.onlyBuiltDependencies` list current in root `package.json`.

**React 18 with Next 16:**
- Risk: Framework may move default recommendations faster than app `react`/`react-dom` pins (`18.2.0` in `apps/dokploy/package.json`).
- Impact: Subtle hydration or feature gaps vs Next expectations.
- Migration plan: Follow Next upgrade guides; test app router and server components holistically before bumping React major.

## Missing Critical Features

**Not inferred from code scan:**
- Problem: Product-level gaps are not enumerated without roadmap context.
- Current workaround: See `.planning/ROADMAP.md` and phase plans under `.planning/phases/`.
- Blocks: Not specified here.

## Test Coverage Gaps

**No automated tests in `@dokploy/server` package:**
- What's not tested: Core services (`packages/server/src/services/*`), Docker/SSH utilities, backup flows, and most provisioning logic lack co-located `*.test.ts`.
- Risk: Regressions in deploy, backup, and provider integrations ship without unit signal.
- Priority: High.
- Difficulty to test: Requires heavy mocking of Docker/SSH or containerized CI fixtures.

**Vitest scope limited to `apps/dokploy` `src/__test__`:**
- Config: `apps/dokploy/src/__test__/vitest.config.ts` includes only `src/__test__/**/*.test.ts` (no `*.test.tsx`).
- What's not tested: Almost all React components, pages, and tRPC procedure wiring except indirectly.
- Risk: UI and procedure integration bugs escape until manual or E2E testing.
- Priority: Medium.
- Difficulty to test: Add React Testing Library + MSW or Playwright per critical flows.

**Public and webhook endpoints under-tested:**
- What's not tested: SSRF path for `compose.templates`, full webhook signature validation for all providers in `apps/dokploy/src/pages/api/deploy/[refreshToken].ts` and related routes.
- Risk: Security and reliability issues in externally exposed HTTP surface.
- Priority: High for SSRF; Medium for webhook parity.
- Difficulty to test: Requires security-focused tests and fixture payloads per provider.

---

*Concerns audit: 2026-04-11*
*Update as issues are fixed or new ones discovered*
