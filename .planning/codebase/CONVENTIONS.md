# Coding Conventions

**Analysis Date:** 2026-04-11

## Naming Patterns

**Files:**
- React components and modules: kebab-case filenames (e.g. `onboarding-step-repository.tsx`, `update-server-config.test.ts`).
- Tests: `*.test.ts` only under `apps/dokploy/src/__test__/`, mirroring domain folders (`compose/`, `permissions/`, `deploy/`, …).

**Functions:**
- camelCase for functions and variables.
- Event handlers: `handle` prefix where used (e.g. handlers in forms).

**Variables:**
- camelCase for locals and properties.
- Constants: prefer descriptive names; no single enforced SCREAMING_SNAKE_CASE rule in Biome—follow surrounding modules.

**Types:**
- PascalCase for interfaces, types, and Zod-inferred shapes.
- Props interfaces often named `{ComponentName}Props` (e.g. `OnboardingStepRepositoryProps` in `apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx`).

**React exports:**
- **Pages** (`apps/dokploy/src/pages/**/*.tsx`): default export is the norm—typically `const Page = …` then `export default Page` or `export default NamedComponent`.
- **Components** under `apps/dokploy/src/components/`: prefer **named exports** (e.g. `export const OnboardingStepRepository`).

## Code Style

**Formatting & linting:**
- **Biome** (`@biomejs/biome` in root `package.json`) is the single formatter and linter for the monorepo.
- Configuration: `biome.json` (repository root). Ignores include `.next/`, `dist/`, `drizzle/`, `node_modules/`, and `packages/server/package.json`.

**Import assist:**
- `assist.actions.source.organizeImports` is `"on"` in `biome.json`—use Biome to sort and organize imports.

**Key linter rules (from `biome.json`):**
- **Errors:** `noUnusedImports`, `noUnusedFunctionParameters`, `noParameterAssign`, `useAsConstAssertion`, `useDefaultParameterLast`, `useEnumInitializers`, `useSelfClosingElements`, `useSingleVarDeclarator`, `noUnusedTemplateLiteral`, `useNumberNamespace`, `noInferrableTypes`, `noUselessElse`.
- **Off (explicit):** `noUnusedVariables`, `noExplicitAny`, `useExhaustiveDependencies`, many a11y rules (e.g. `useKeyWithClickEvents`), `noDangerouslySetInnerHtml`.
- New code should not rely on disabled rules as an excuse for poor quality; fix issues when touching files.

**Commands:**
- Repo root: `pnpm run format-and-lint` (check), `pnpm run format-and-lint:fix` or `pnpm run check` (write fixes).
- App: `apps/dokploy/package.json` — `pnpm run lint`, `pnpm run format`, `pnpm run check` (Biome with write).

**TypeScript:**
- Main app strictness: `apps/dokploy/tsconfig.json` — `strict`, `noUncheckedIndexedAccess`, `checkJs`, `moduleResolution: Bundler`, `jsx: react-jsx`.
- Packages follow their own `tsconfig` (e.g. `packages/server`); keep `strict` alignment when adding code.

## Import Organization

**Order:**
- Rely on **Biome “organize imports”** rather than manual rules.
- Typical structure after organize: Node builtins (`node:path`), external packages, workspace aliases, relative imports, then `import type` where split.

**Path aliases (dokploy app):**
- `@/*` → `apps/dokploy/src/*` (`apps/dokploy/tsconfig.json`).
- `@dokploy/server` and `@dokploy/server/*` → `packages/server/src` (see `paths` in `apps/dokploy/tsconfig.json`).

**Monorepo:**
- Consume shared logic via `@dokploy/server` from `packages/server` rather than deep relative paths across packages.

## Error Handling

**tRPC / HTTP API surface:**
- Services and routers throw `@trpc/server` **`TRPCError`** with `code` and `message` (and sometimes `cause`) for client-visible failures—see `packages/server/src/services/compose.ts`, `packages/server/src/services/backup.ts`, and routers such as `apps/dokploy/src/server/api/routers/server.ts`.

**Generic errors:**
- Wrap or map unknown errors to `TRPCError` with `BAD_REQUEST` or appropriate code when catching in procedures (pattern in `server.ts` validate procedure).

**Scripts / one-off:**
- Some entry scripts use `try/catch` with `console.error` and `process.exit` (e.g. `apps/dokploy/src/migration.ts`)—acceptable for CLI-style bootstrap, not for core service logic.

## Logging

**Framework:**
- **Pino** via `packages/server/src/lib/logger.ts` — `export const logger = pino({ transport: { target: "pino-pretty", … } })`.

**Patterns:**
- Use `logger.info`, `logger.warn`, `logger.error` with structured first argument when helpful (see `packages/server/src/billing/payment.ts`, `packages/server/src/jobs/charge-subscriptions.ts`).
- Do not add noisy `console.log` in shared libraries; scripts may use `console` for operator feedback.

## Comments

**When to comment:**
- Explain non-obvious behavior, invariants, or deployment layout (e.g. migration path comment in `apps/dokploy/src/migration.ts`).
- Test setup: `apps/dokploy/src/__test__/setup.ts` documents why the DB module is mocked globally.

**JSDoc:**
- Used selectively; not required on every exported symbol. Prefer clear names and types.

## Function Design

**Size & structure:**
- Large routers and services exist; prefer extracting helpers when adding behavior rather than growing single procedures further.
- Use early returns and guard clauses consistent with Biome `noUselessElse`.

**Parameters:**
- tRPC uses `.input(zodSchema)`—validate at the boundary with Zod (`zod` v4 in `apps/dokploy/package.json`).

## Module Design

**Exports:**
- **Pages:** default export.
- **Components and server modules:** named exports are common.
- tRPC: routers composed in `apps/dokploy/src/server/api/root.ts` as `appRouter` object; sub-routers in `apps/dokploy/src/server/api/routers/`.

**Barrel / workspace package:**
- Server package entry: `packages/server/package.json` `exports` map to `./src/...`—import from `@dokploy/server` or subpaths as defined there.

---

*Convention analysis: 2026-04-11*
