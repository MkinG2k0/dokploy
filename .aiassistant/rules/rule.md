---
apply: always
---

# DeployBox — Cursor Rules

# Форк Dokploy. Monorepo: apps/dokploy + packages/server

# ═══════════════════════════════════════════

# АРХИТЕКТУРА ПРОЕКТА

# ═══════════════════════════════════════════

## Структура монорепо

- `apps/dokploy/` — Next.js приложение (UI + API routes + tRPC)
- `packages/server/` — серверная логика (auth, billing, db, jobs, emails)
- `packages/server/src/billing/` — T-Касса интеграция
- Используй алиасы: `@/*` для app-слоя, `@dokploy/server/*` для packages/server

## Стек

- Next.js (Pages Router, НЕ App Router)
- tRPC для API (роуты в `apps/dokploy/src/server/api/routers/`)
- Drizzle ORM (НЕ Prisma) — схема в `apps/dokploy/src/server/db/schema/`
- better-auth для аутентификации
- Docker Swarm + Traefik на сервере
- pnpm workspaces
- TypeScript strict mode

# ═══════════════════════════════════════════

# ПРАВИЛА КОДА

# ═══════════════════════════════════════════

## TypeScript

- Всегда strict TypeScript — никаких `any`
- Явно типизируй возвращаемые значения функций
- Используй `type` для объектов, `interface` для публичных контрактов
- Zod для валидации входных данных в tRPC процедурах
- Никогда не используй `// @ts-ignore` — исправляй типы

## Именование

- Компоненты: PascalCase (`BillingPage.tsx`)
- Хуки: camelCase с префиксом use (`useSubscription.ts`)
- Утилиты: camelCase (`generateToken.ts`)
- Константы: UPPER_SNAKE_CASE (`PLANS`, `MAX_SERVERS`)
- tRPC роуты: camelCase (`billing.createCheckout`)
- БД таблицы: snake_case (`subscription`, `payment`)
- Drizzle схема файлы: camelCase (`billing.ts`, `users.ts`)

## Файловая структура

- Один компонент = один файл
- Связанные компоненты группируй в папку (`components/billing/`)
- Не создавай файлы длиннее 300 строк — разбивай на модули
- index.ts для реэкспортов из папки

## Импорты

- Используй алиасы везде — никаких `../../../`
- Порядок импортов: react → next → внешние → внутренние → типы
- Типы импортируй через `import type`

# ═══════════════════════════════════════════

# БАЗА ДАННЫХ (DRIZZLE)

# ═══════════════════════════════════════════

- ТОЛЬКО Drizzle ORM — не добавлять Prisma
- Схемы в `apps/dokploy/src/server/db/schema/`
- После изменения схемы ВСЕГДА запускай `drizzle-kit generate`
- Миграции коммитить вместе с изменением схемы
- Используй `cuid()` для первичных ключей (не uuid)
- Amount (деньги) хранить в КОПЕЙКАХ как integer
- Datetime хранить как timestamp, не string
- Всегда добавляй `createdAt` и `updatedAt` в таблицы
- Индексы на foreign keys и поля по которым фильтруешь

## Паттерн работы с БД

```typescript
// Правильно — через db инстанс
import { db } from "@/server/db"
import { subscriptions } from "@/server/db/schema"

const sub = await db.query.subscriptions.findFirst({
	where: eq(subscriptions.userId, userId)
})

// Неправильно — никакого raw SQL без крайней необходимости
```

# ═══════════════════════════════════════════

# tRPC

# ═══════════════════════════════════════════

- Роуты только в `apps/dokploy/src/server/api/routers/`
- Регистрируй новые роутеры в `root.ts`
- Используй `protectedProcedure` для защищённых эндпоинтов
- Валидация через Zod schema на входе
- Никогда не возвращай чувствительные данные (пароли, токены)
- Обрабатывай ошибки через `TRPCError`

```typescript
// Паттерн tRPC роута
export const billingRouter = createTRPCRouter({
  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["pro", "agency"]) }))
    .mutation(async ({ ctx, input }) => {
      // логика
    }),
})
```

# ═══════════════════════════════════════════

# БИЛЛИНГ (T-КАССА)

# ═══════════════════════════════════════════

- Используй ТОЛЬКО `payment` инстанс из `@/billing/payment`
- Amount ВСЕГДА в рублях в публичном API обёртки (конвертация внутри)
- OrderId ВСЕГДА через `cuid()` — никогда не повторяется
- CustomerKey ВСЕГДА = userId
- Для подписок ВСЕГДА `recurrent: true` при init
- Webhook ВСЕГДА отвечает строкой `"OK"` — не JSON
- ВСЕГДА верифицируй Token вебхука перед обработкой
- ВСЕГДА проверяй статус через GetState перед активацией
- Идемпотентность — проверяй что платёж не обработан дважды
- Никогда не логировать: PAN, CVV, пароли, секреты
- Логировать только: PaymentId, OrderId, Status, ErrorCode

```typescript
// Правильно
const {paymentUrl} = await payment.init({
	amount: 399,        // рубли — конвертация внутри
	orderId: cuid(),    // уникальный
	userId: ctx.user.id,
	recurrent: true,
})

// Неправильно
const res = await fetch("https://securepay.tinkoff.ru/v2/Init", {...})
// Не делай прямые запросы — используй обёртку
```

# ═══════════════════════════════════════════

# БЕЗОПАСНОСТЬ

# ═══════════════════════════════════════════

- Никогда не логировать секреты, токены, пароли, CVV
- Env переменные только через `process.env.VAR_NAME` — не хардкодить
- Проверять аутентификацию в каждом защищённом tRPC роуте
- Валидировать все входные данные через Zod
- Не доверять данным из webhook без верификации подписи
- SQL инъекции невозможны если используешь Drizzle ORM правильно
- Не возвращать stack traces в продакшене

## Чувствительные env (никогда не коммитить)

```
TINKOFF_TERMINAL_KEY
TINKOFF_PASSWORD
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
DATABASE_URL
```

# ═══════════════════════════════════════════

# UI / КОМПОНЕНТЫ

# ═══════════════════════════════════════════

- shadcn/ui как основа компонентов
- lucide-react для иконок — никаких других иконок
- Tailwind CSS — никакого inline style
- **Классы Tailwind:** по умолчанию в `className` / `cn(...)` в JSX или в `cva()` для много-variant компонентов. Если *
  *одна и та же длинная** строка классов повторяется **два и больше раз** в одном компоненте — вынеси в **локальную**
  переменную в теле компонента (`const rowClass = "..."`) и переиспользуй; так проще править и не разъезжаются токены.
  Не плодить константы **уровня модуля** для стилей, если они используются только в одном компоненте (исключение: общий
  пресет в том же файле для нескольких экспортируемых компонентов). Константы уровня модуля по-прежнему для не-CSS:
  статусы API, лимиты, ключи i18n.
- Тёмная тема по умолчанию (как в Dokploy)
- Адаптивность обязательна (mobile-first)
- Используй существующие компоненты из `components/ui/` — не пересоздавай
- Loading states через skeleton или spinner
- Error states всегда обрабатывать и показывать юзеру

## Паттерн компонента

```typescript
// Правильно
interface BillingCardProps {
  plan: "free" | "pro" | "agency"
  isCurrentPlan: boolean
  onSelect: () => void
}

export function BillingCard({ plan, isCurrentPlan, onSelect }: BillingCardProps) {
  // ...
}

// Неправильно — никаких default export для компонентов
export default function BillingCard() {} // ✗
```

# ═══════════════════════════════════════════

# ЛОГИРОВАНИЕ

# ═══════════════════════════════════════════

- Используй pino logger из `packages/server/src/lib/logger.ts`
- Никаких `console.log` в продакшен коде
- `console.log` допустим только во время разработки с пометкой TODO
- Уровни: error (падения), warn (нештатные ситуации), info (важные события)
- Структурированные логи — объект с полями, не строки

```typescript
// Правильно
logger.error({ paymentId, errorCode, userId }, "Payment failed")

// Неправильно
console.log("Payment failed:", paymentId)
```

# ═══════════════════════════════════════════

# ОБРАБОТКА ОШИБОК

# ═══════════════════════════════════════════

- Всегда try/catch в async функциях работающих с внешним API
- В крон-джобах — никогда не прерывать весь цикл из-за одной ошибки
- Различать REJECTED (финальный) и UNKNOWN (retry) в биллинге
- Возвращать понятные ошибки через TRPCError с message на русском

```typescript
// Паттерн крон-джоба — не падать на одном юзере
for (const user of users) {
	try {
		await chargeUser(user)
	} catch (err) {
		logger.error({userId: user.id, err}, "Charge failed, continuing")
		// Продолжаем цикл
	}
}
```

# ═══════════════════════════════════════════

# DOCKER / ДЕПЛОЙ

# ═══════════════════════════════════════════

- Приложение работает в Docker Swarm — не в обычном docker-compose
- Env переменные добавлять через `docker service update --env-add`
- Никогда не хранить секреты в образе — только через env
- После изменения env контейнер перезапускается автоматически
- Health check endpoint: `/api/trpc/settings.health`

# ═══════════════════════════════════════════

# ПЛАНЫ И ЦЕНЫ

# ═══════════════════════════════════════════

## Всегда используй константы из PLANS — не хардкодь цены

```typescript
import { PLANS } from "@dokploy/server/billing/plans"

// Free:   0₽/мес   — 1 сервер
// Pro:    399₽/мес — 10 серверов, мониторинг, rollback
// Agency: 999₽/мес — 50 серверов, AI Deploy, API, SLA
```

## Модель монетизации

- Платформа (Free/Pro/Agency) + Сервер (маржа ~10-15% поверх Aeza)
- Amount для T-Касса: Pro=39900 копеек, Agency=99900 копеек
- VPS через Aeza API — юзер не знает про Aeza

# ═══════════════════════════════════════════

# ЗАПРЕЩЕНО

# ═══════════════════════════════════════════

- ✗ Не добавлять Prisma — только Drizzle
- ✗ Не использовать Stripe — только T-Касса
- ✗ Не делать прямые fetch к T-Bank API — только через payment инстанс
- ✗ Не использовать App Router — только Pages Router
- ✗ Не хардкодить цены — только через PLANS константы
- ✗ Не логировать секреты и платёжные данные
- ✗ Не использовать `any` в TypeScript
- ✗ Не делать `../../../` импорты — только алиасы
- ✗ Не отвечать JSON из webhook T-Касса — только строка "OK"
- ✗ Не запускать миграции вручную — только через drizzle-kit

# ═══════════════════════════════════════════

# ПОСЛЕ КАЖДОГО ИЗМЕНЕНИЯ

# ═══════════════════════════════════════════

pnpm typecheck && pnpm build

# Если изменил схему БД:

pnpm drizzle-kit generate
