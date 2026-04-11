# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework

**Runner:**
- **Vitest** `^4.0.18` (`apps/dokploy/package.json` devDependency).
- Config: `apps/dokploy/src/__test__/vitest.config.ts` (referenced by `"test": "vitest --config src/__test__/vitest.config.ts"` in `apps/dokploy/package.json`).

**Assertion library:**
- Vitest built-in `expect`, `test` / `it`, `describe`, `beforeEach`, `vi`.

**Run commands:**
```bash
pnpm test                    # from repo root — runs dokploy test script
pnpm --filter=dokploy test   # explicit workspace filter
cd apps/dokploy && pnpm test # from app directory
```

**Vitest environment:**
- `pool: "forks"` in `apps/dokploy/src/__test__/vitest.config.ts`.
- `include`: only `src/__test__/**/*.test.ts` (no `*.test.tsx`, no colocated tests next to source).
- `exclude`: `node_modules`, `dist`, `.docker`.

## Test File Organization

**Location:**
- All automated tests live under `apps/dokploy/src/__test__/`, grouped by domain: `compose/`, `deploy/`, `permissions/`, `env/`, `traefik/`, `wss/`, `templates/`, `utils/`, `cluster/`, `requests/`, `drop/`, `server/`, etc.

**Naming:**
- `*.test.ts` exclusively (48 files at time of analysis). No `*.spec.ts` in this repo.

**Other workspaces:**
- `packages/server`, `apps/api`, and `apps/schedules` have **no** `test` script in their `package.json`—shared logic is tested indirectly through dokploy’s Vitest suite and manual/CI flows.

## Global setup

**File:** `apps/dokploy/src/__test__/setup.ts`

- Calls `vi.mock("@dokploy/server/db", …)` to provide a **chainable mock** `db` so importing `@dokploy/server` does not open a real PostgreSQL connection (avoids `ECONNREFUSED` in CI).
- Every test run loads this via `setupFiles` in `apps/dokploy/src/__test__/vitest.config.ts`.

## Vitest / Vite configuration

**TypeScript paths:**
- Plugin `vite-tsconfig-paths` with project `apps/dokploy/tsconfig.json`.

**Alias:**
- `@dokploy/server` → `packages/server/src` (directory resolve in `apps/dokploy/src/__test__/vitest.config.ts`) so tests hit source, not a built bundle.

**Environment stubs:**
- `define.process.env` in config sets safe dummy values for `NODE`, `GITHUB_*`, `GOOGLE_*` during tests.

## Test structure

**Suite style:**
- **`describe` + `it`** for grouped cases (e.g. `apps/dokploy/src/__test__/permissions/check-permission.test.ts`).
- **`test`** for flatter files (e.g. `apps/dokploy/src/__test__/compose/compose.test.ts`, `apps/dokploy/src/__test__/traefik/server/update-server-config.test.ts`).

**Example (nested):**
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("static roles bypass enterprise resources", () => {
  it("owner bypasses deployment.read", async () => {
    await expect(checkPermission(ctx, { deployment: ["read"] })).resolves.toBeUndefined();
  });
});
```
(Pattern from `apps/dokploy/src/__test__/permissions/check-permission.test.ts`.)

**Async:**
- Use `async` `it`/`test` with `await expect(…).resolves` / `rejects` for promises.

## Mocking

**Tool:** Vitest `vi.mock`, `vi.fn`, `vi.clearAllMocks`, `vi.importActual`, dynamic `await import()` after mocks when order matters.

**Module mocking patterns:**
- **DB:** Often overridden per file for specific `query.*` tables (e.g. `apps/dokploy/src/__test__/deploy/application.command.test.ts`) in addition to global setup.
- **Partial mock:** `vi.mock("…", async () => { const actual = await vi.importActual<…>("…"); return { ...actual, fn: vi.fn() }; })` — see `application.command.test.ts` for `application`, `git`, `builders`.
- **Permission tests:** Mock `@dokploy/server/db` and `@dokploy/server/services/proprietary/license-key`, then `const { checkPermission } = await import("@dokploy/server/services/permission")` (`check-permission.test.ts`).

**Filesystem:**
- **memfs** (`memfs` in `apps/dokploy` devDependencies): `vi.mock("node:fs", () => ({ ...fs, default: fs }))` with `vol.reset()` in `beforeEach` — `apps/dokploy/src/__test__/traefik/server/update-server-config.test.ts`.

**What to mock:**
- Database access, external services, `exec`/process runners, notifications, and `node:fs` when testing file-writing helpers.

**What not to mock:**
- Pure parsing/transform logic when testing YAML/compose behavior (large string fixtures in test file, e.g. `apps/dokploy/src/__test__/compose/compose.test.ts`).

## Fixtures and factories

**Inline fixtures:**
- Large YAML/strings embedded in test files for compose/traefik/config scenarios.

**Factory helpers:**
- Functions like `mockMemberData`, `createMockApplication` defined at top of test file with `overrides` partials (`check-permission.test.ts`, `application.command.test.ts`).

**Shared types:**
- `typeof table.$inferSelect` and explicit types for settings rows where DB shape must match schema (`update-server-config.test.ts`).

## Coverage

**Requirements:**
- **No** `test:coverage` script or coverage threshold in `package.json` files searched—coverage is not enforced in-repo via scripts at analysis time.

**How to add coverage (if needed):**
- Extend `apps/dokploy/src/__test__/vitest.config.ts` with Vitest `coverage` options and a script in `apps/dokploy/package.json`; align excludes with Biome/Vitest `exclude` patterns.

## Test types

**Unit / integration:**
- Tests mix isolated logic (compose suffix hashing, permission matrix) with multi-module flows (`deployApplication` with many mocks). All run in the same Vitest config—no separate `*.integration.test.ts` naming.

**E2E:**
- **Not present** in this repository (no Playwright/Cypress config under workspace root for dokploy at analysis time).

## Common patterns

**Error testing:**
```typescript
await expect(promise).rejects.toThrow(SomeError);
// or
await expect(promise).rejects.toMatchObject({ code: "..." });
```

**Hoisting note:**
- `vi.mock` calls are hoisted; place them before imports of the module under test, or use dynamic `import()` after mocks for modules that must see mock state (`check-permission.test.ts` pattern).

---

*Testing analysis: 2026-04-11*
