# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**Git hosting & Dev platforms:**
- **GitHub** — репозитории, GitHub App, Issues/PR комментарии для preview
  - SDK: `octokit`, `@octokit/auth-app`, `@octokit/rest`, `@octokit/webhooks`
  - Код: `packages/server/src/utils/providers/github.ts`, `packages/server/src/services/github.ts`, `apps/dokploy/src/pages/api/deploy/github.ts`, OAuth в `packages/server/src/lib/auth.ts` (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
- **GitLab** — клонирование и провайдеры
  - Код: `packages/server/src/utils/providers/gitlab.ts`, `packages/server/src/services/gitlab.ts`, использование в `packages/server/src/services/application.ts`, `compose.ts`
- **Bitbucket** — провайдер и ветки
  - Код: `packages/server/src/utils/providers/bitbucket.ts`, `packages/server/src/services/bitbucket.ts`
- **Gitea** — OAuth/token refresh, внутренний URL
  - Код: `packages/server/src/utils/providers/gitea.ts`, `packages/server/src/services/gitea.ts`

**Payments & billing:**
- **Тинькофф (T-Bank)** — платежи, вебхуки, подписки
  - Код: `packages/server/src/billing/tinkoff.ts`, `packages/server/src/billing/payment.ts`, HTTP-обработчик `apps/dokploy/src/pages/api/webhooks/tinkoff.ts`
  - Переменные (имена): `TINKOFF_TERMINAL_KEY`, `TINKOFF_PASSWORD`, `TINKOFF_API_BASE_URL`, `NEXT_PUBLIC_APP_URL`; флаги/тест: `TINKOFF_LOW_PRICE_PAYMENT_ENABLED`, `BILLING_SUBSCRIPTION_PERIOD_TEST`

**Email:**
- **Resend** — транзакционные письма при настроенном канале уведомлений
  - SDK: `resend`
  - API-ключ хранится в записи провайдера в БД (не в env): `packages/server/src/utils/notifications/utils.ts` (`sendResendNotification`)
- **SMTP (Nodemailer)** — письма уведомлений и опционально dev-логин
  - Код: `packages/server/src/utils/notifications/utils.ts`, `packages/server/src/lib/auth.ts` (`SMTP_SERVER` и связанные настройки для Better Auth)

**Marketing / CRM:**
- **HubSpot** — отправка форм (лиды)
  - Код: `packages/server/src/utils/tracking/hubspot.ts`
  - Переменные: `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID`

**VPS / cloud onboarding:**
- **Aeza** — заказ/настройка серверов через API
  - Код: `packages/server/src/services/aeza-onboarding.ts`
  - Переменные: `AEZA_API_TOKEN`, `AEZA_API_BASE_URL`, `AEZA_OS_PARAMETER_ID`, `AEZA_ORDER_TERM`, `AEZA_ORDER_METHOD`

**AI / LLM:**
- Провайдеры через Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/azure`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/deepinfra`, `@ai-sdk/openai-compatible`, `ai-sdk-ollama`)
  - Код: `packages/server/src/services/ai.ts`
  - Ключи и endpoint обычно задаются в настройках продукта/окружения приложения (см. UI и конфигурацию AI в Dokploy), не дублировать секреты в документации

**Deployment orchestration (внешний сервис при использовании Inngest Cloud):**
- **Inngest** — очередь событий деплоя в `apps/api`
  - Клиент: `inngest`, endpoint приложения: `GET|POST|PUT /api/inngest` в `apps/api/src/index.ts`
  - Переменные: `INNGEST_BASE_URL`, `INNGEST_SIGNING_KEY` (используются при запросе к API Inngest из `apps/api/src/service.ts`)

**Internal HTTP (межсервисное взаимодействие):**
- Деплой-сервис: `SERVER_URL`, заголовок `X-API-Key` = `API_KEY` — `apps/dokploy/src/server/utils/deploy.ts`
- Планировщик задач (бэкапы и др.): `JOBS_URL`, тот же `API_KEY` — `apps/dokploy/src/server/utils/backup.ts`
- Защита маршрутов Hono в `apps/api/src/index.ts` и `apps/schedules/src/index.ts` — сравнение `API_KEY` с заголовком `X-API-Key` (кроме `/health` и для API — `/api/inngest`)

## Data Storage

**Databases:**
- **PostgreSQL** — основное хранилище Dokploy
  - Подключение: `DATABASE_URL` **или** сборка URL из `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT` + пароль из файла `POSTGRES_PASSWORD_FILE` (`packages/server/src/db/constants.ts`)
  - Клиент: `postgres` + Drizzle (`packages/server/src/db/index.ts`)
  - Миграции: Drizzle Kit, каталог миграций `drizzle/` (относительно конфига в `apps/dokploy/src/server/db/drizzle.config.ts`)

**File Storage:**
- Локальные/смонтированные тома на сервере Dokploy: пути из `packages/server/src/constants/index.ts` (`paths()`: приложения, compose, SSH, сертификаты Traefik, логи и т.д.)
- Резервные копии БД через `docker exec` / `pg_dump` в контейнере Postgres — `packages/server/src/utils/backups/web-server.ts`

**Caching / queues:**
- **Redis** — BullMQ
  - `apps/schedules`: `REDIS_URL` в `apps/schedules/src/queue.ts`, `apps/schedules/src/workers.ts`
  - `apps/dokploy`: хост `REDIS_HOST` (prod по умолчанию `dokploy-redis`) или `127.0.0.1` в dev — `apps/dokploy/src/server/queues/redis-connection.ts`
- Пакет `redis` (`apps/api/package.json`) — при необходимости подключения к Redis из API-сервиса (проверить фактическое использование в `apps/api/src`)

## Authentication & Identity

**Auth provider:**
- **Better Auth** с Drizzle adapter, плагины `admin`, `organization`, `twoFactor`, API keys, SSO
  - Реализация: `packages/server/src/lib/auth.ts`
  - HTTP: `apps/dokploy/src/pages/api/auth/[...all].ts` (`toNodeHandler` from `better-auth/node`)
  - Секрет сессий: `BETTER_AUTH_SECRET` (`packages/server/src/constants/index.ts`; при отсутствии используется небезопасный дефолт — задавать в production)

**OAuth (социальный вход):**
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — `packages/server/src/lib/auth.ts`
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — там же

**Admin / impersonation:**
- `USER_ADMIN_ID` — суперпользователь для проверок в tRPC (`apps/dokploy/src/server/api/routers/user.ts`)
- `SUPER_ADMIN_EMAIL` — аудит-утилита (`apps/dokploy/src/server/api/utils/audit.ts`)

## Monitoring & Observability

**Error tracking:**
- Отдельного Sentry/Datadog в зависимостях не обнаружено; логирование через `pino` (`apps/api/src/logger.ts`, аналогичные паттерны в schedules)

**Logs:**
- Структурированные логи приложений; стрим логов контейнеров через WebSocket — `apps/dokploy/src/server/wss/docker-container-logs.ts`

## CI/CD & Deployment

**CI:**
- GitHub Actions — `.github/workflows/pull-request.yml` (build, test, typecheck; для тестов ставятся Nixpacks и Railpack), `pr-quality.yml`, `format.yml`, `deploy.yml`, `dokploy.yml`, и др.

**Hosting:**
- Сам Dokploy разворачивается как приложение с Docker; версии образов/релизы — `process.env.RELEASE_TAG` в `packages/server/src/services/settings.ts`
- Облачный режим: `IS_CLOUD === "true"` (`packages/server/src/constants/index.ts`), списки IP: `DOKPLOY_CLOUD_IPS` — `apps/dokploy/src/server/api/routers/settings.ts`

## Environment Configuration

**Шаблоны переменных (без значений):**
- `apps/dokploy/.env.example`, `apps/api/.env.example`

**Часто встречающиеся имена (не исчерпывающий список):**
- Приложение: `PORT`, `HOST`, `NODE_ENV`, `TURBOPACK`, `SKIP_DEV_MIGRATIONS`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BILLING_REFUND_TELEGRAM`
- Docker API: `DOKPLOY_DOCKER_HOST`, `DOKPLOY_DOCKER_PORT`, `DOKPLOY_DOCKER_API_VERSION`
- Traefik: `TRAEFIK_PORT`, `TRAEFIK_SSL_PORT`, `TRAEFIK_HTTP3_PORT`, `TRAEFIK_VERSION` — `packages/server/src/setup/traefik-setup.ts`
- Postgres wait: `POSTGRES_WAIT_TIMEOUT`, `POSTGRES_WAIT_RETRY` — `apps/dokploy/src/wait-for-postgres.ts`

**Секреты:**
- Хранить вне репозитория; пароли БД предпочтительно через `POSTGRES_PASSWORD_FILE` (см. предупреждение в `packages/server/src/db/constants.ts` о deprecated-режиме без файла секрета)

## Webhooks & Callbacks

**Incoming:**
- **Тинькофф** — `apps/dokploy/src/pages/api/webhooks/tinkoff.ts` (верификация через `verifyWebhook` / токен в `packages/server/src/billing/`)
- **GitHub** — деплой по событиям: `apps/dokploy/src/pages/api/deploy/github.ts` (`@octokit/webhooks`), см. также `apps/dokploy/src/pages/api/deploy/compose/[refreshToken].ts` (ping)
- **Deploy по refresh token** — `apps/dokploy/src/pages/api/deploy/[refreshToken].ts` (в т.ч. registry package события GitHub в комментариях к коду)

**Outgoing:**
- HTTP вызовы к `SERVER_URL` и `JOBS_URL` с `API_KEY` для постановки деплоев и задач бэкапа
- События Inngest `deployment/requested`, `deployment/cancelled`, `deployment/completed`, `deployment/failed` — `apps/api/src/index.ts`

---

*Integration audit: 2026-04-11*
