# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**
- TypeScript (~5.8) — приложение, пакеты и вспомогательные скрипты (`apps/*`, `packages/*`)

**Secondary:**
- Shell — Docker/CI скрипты (например `apps/dokploy/docker/build.sh`, `apps/dokploy/docker/push.sh`)
- Markdown — документация в репозитории

## Runtime

**Environment:**
- Node.js `^24.4.0` — задано в `package.json` (корень) и в `apps/dokploy/package.json`, `packages/server/package.json`, `apps/api/package.json`, `apps/schedules/package.json`
- CI: Node `24.4.0` в `.github/workflows/pull-request.yml`

**Package Manager:**
- pnpm `10.22.0` — поле `packageManager` в корневом `package.json`
- Минимальная версия: `pnpm >= 9.12.0` (корень) / `>= 10.22.0` в пакетах приложения
- Lockfile: `pnpm-lock.yaml` в корне репозитория

## Frameworks

**Core:**
- Next.js `^16.2.0` — UI и часть API routes (`apps/dokploy`)
- React `18.2.0` / React DOM `18.2.0` — интерфейс (`apps/dokploy`, зависимости `@dokploy/server` для email-шаблонов)
- tRPC `^11.10.0` — типобезопасный RPC между клиентом и сервером (`apps/dokploy`, `@trpc/server` в `packages/server`)
- Hono `^4.11.7` — HTTP-сервисы деплоев и расписаний (`apps/api`, `apps/schedules`) с `@hono/node-server`, `@hono/zod-validator`
- Drizzle ORM `0.45.1` + `drizzle-kit` — схема БД и миграции (`apps/dokploy/src/server/db/drizzle.config.ts`, `packages/server/src/db/`)
- postgres (postgres.js) `3.4.4` — драйвер PostgreSQL для Drizzle (`packages/server/src/db/index.ts`)

**Testing:**
- Vitest `^4.0.18` — юнит/интеграционные тесты; конфиг: `apps/dokploy/src/__test__/vitest.config.ts` (скрипт `pnpm --filter=dokploy run test` из корня)

**Build/Dev:**
- TypeScript `^5.8.3` — компиляция и `tsc --noEmit` (`typecheck` в воркспейсе)
- esbuild `0.20.2` — сборка серверного бандла Dokploy (`apps/dokploy/esbuild.config.ts`), также в `packages/server`
- tsx `^4.16.2` — запуск TypeScript в dev и скриптах
- Tailwind CSS `^3.4.17` + `tailwindcss-animate`, `@tailwindcss/typography` — стили UI (`apps/dokploy`)
- Biome `2.1.1` — линт и форматирование; конфиг `biome.json` в корне

## Key Dependencies

**Critical:**
- `better-auth` `1.5.4` + `@better-auth/api-key`, `@better-auth/sso` — аутентификация, сессии, OAuth, 2FA (`packages/server/src/lib/auth.ts`, `apps/dokploy/src/pages/api/auth/[...all].ts`, `apps/dokploy/src/lib/auth-client.ts`)
- `drizzle-orm` / `drizzle-zod` — данные и валидация, связка с Better Auth adapter
- `@tanstack/react-query` — серверное состояние на клиенте в связке с tRPC
- `dockerode` `4.0.2` — управление Docker Engine (`packages/server/src/constants/index.ts` singleton)
- `bullmq` `5.67.3` — очереди в основном приложении; отдельно в `apps/schedules` для задач по расписанию
- `inngest` `3.40.1` — оркестрация деплоев в `apps/api` (`apps/api/src/index.ts`)
- `ai` + `@ai-sdk/*` (OpenAI, Anthropic, Azure, Mistral, Cohere, DeepInfra, OpenAI-compatible) + `ai-sdk-ollama` — LLM-интеграции (`packages/server/src/services/ai.ts`, зависимости в `apps/dokploy/package.json`)

**Infrastructure:**
- `ws` `8.16.0`, `node-pty` — WebSocket и терминал/логи (`apps/dokploy/src/server/wss/`)
- `ssh2` — удалённые серверы и SSH
- `zod` `^4.3.6` — схемы валидации (API, tRPC, формы с `@hookform/resolvers`)
- `pino` / `pino-pretty` — структурированные логи
- `next-intl` — i18n в Next-приложении

## Configuration

**Environment:**
- Загрузка через `dotenv` (`-r dotenv/config` в скриптах `apps/dokploy/package.json`)
- Production-сборка сервера подставляет переменные из `apps/dokploy/.env.production` в бандл через `prepareDefine` в `apps/dokploy/esbuild.config.ts` (исключение: `DATABASE_URL` остаётся рантайм-переменной)
- Шаблоны имён переменных без секретов: `apps/dokploy/.env.example`, `apps/api/.env.example`

**Build:**
- Next: `apps/dokploy/next.config.mjs` (`transpilePackages: ['@dokploy/server']`, security headers)
- Drizzle Kit: `apps/dokploy/src/server/db/drizzle.config.ts` (schema, dialect `postgresql`, output `drizzle/`)
- Серверный TS для dokploy: `apps/dokploy/tsconfig.server.json`; общий typecheck: `tsc --noEmit` в пакетах
- Пакет `@dokploy/server`: `packages/server/tsconfig.server.json`, `packages/server/esbuild.config.ts`

## Platform Requirements

**Development:**
- Node 24.x и pnpm согласно `engines`
- Локально: PostgreSQL, Redis (для BullMQ в `apps/dokploy` и `apps/schedules` — см. `REDIS_URL` / `REDIS_HOST` в коде)
- Опционально: Docker (для интеграции с Engine, как в проде)

**Production:**
- Типичный таргет: контейнеры / Docker Compose (скрипты `apps/dokploy/docker/*`, пути данных в `packages/server/src/constants/index.ts`: `/etc/dokploy` в production)
- Отдельные процессы: основное приложение Dokploy (Next + кастомный сервер `apps/dokploy/src/server/server.ts`), сервис деплоев `apps/api`, планировщик `apps/schedules`

---

*Stack analysis: 2026-04-11*
