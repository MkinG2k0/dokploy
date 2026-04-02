---
phase: 01-deploybox-onboarding
plan: 02
type: execute
wave: 2
depends_on:
  - "01"
files_modified:
  - apps/dokploy/src/server/api/routers/onboarding.ts
  - packages/server/src/db/schema/server.ts
  - apps/dokploy/drizzle/*.sql
autonomous: true
requirements:
  - ONB-05
  - ONB-10
  - ONB-12
user_setup:
  - service: aeza
    why: "Создание VPS через API Aeza"
    env_vars:
      - name: AEZA_API_TOKEN
        source: "Личный кабинет Aeza (уточнить у продукта)"
      - name: AEZA_PRODUCT_ID_MSK
        source: "ID тарифа/локации Москва для выбранных MSKs-* планов"
    dashboard_config: []
  - service: tbank
    why: "Оплата заказа Aeza через существующий эквайринг"
    env_vars: []
    dashboard_config: []
must_haves:
  truths:
    - "Мутация createAezaServer создаёт заказ/сервер и возвращает идентификатор для опроса статуса"
    - "getServerStatus отдаёт состояние подготовки VPS до active"
    - "На Free-плане нельзя создать второй Aeza-сервер через onboarding"
  artifacts:
    - path: apps/dokploy/src/server/api/routers/onboarding.ts
      provides: "createAezaServer, getServerStatus"
  key_links:
    - from: onboarding.createAezaServer
      to: server table + Aeza API
      via: "internal service helper"
---

<objective>
Реализовать серверную часть Aeza-онбординга: оплата через существующий T-Bank/billing-поток, генерация SSH-ключей, вызов Aeza API, регистрация сервера в Dokploy тем же способом, что и ручное добавление; опрос статуса; лимит 1 Aeza-сервер для Free на уровне tRPC.

Purpose: Безопасное создание инфраструктуры только через сервер, с бизнес-лимитами.
Output: Новые процедуры роутера, при необходимости колонка(и) в `server` для пометки Aeza/check provision, drizzle-миграция.
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-01-SUMMARY.md

Изучить перед реализацией:

- `packages/server/src/billing/payment.ts` и `apps/dokploy` billing routes — как инициируется оплата T-Bank; переиспользовать паттерн (не дублировать подпись).
- `apps/dokploy/src/server/api/routers/server.ts` — `create`, `withSSHKey`, `getCloudServerLimit`; внутренняя логика создания сервера должна быть переиспользована (вынести в shared helper в `packages/server` или вызывать существующую функцию), а не копировать SQL.

Интерфейсы (ориентир для контрактов процедур):

```typescript
// input
z.object({ tariff: z.enum(["msks-1", "msks-2", "msks-3"]) })

// getServerStatus
z.object({ serverId: z.string() })
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Схема server + миграция для Aeza</name>
  <files>packages/server/src/db/schema/server.ts, apps/dokploy/drizzle/</files>
  <action>Добавить минимальные поля для отслеживания провижена Aeza (например `aezaServiceId` text nullable и/или `provisionedVia: enum('manual'|'aeza'|'test')` — на усмотрение, без избыточности). Сгенерировать drizzle-миграцию в `apps/dokploy/drizzle/`. Лимит ONB-12: считать Aeza-серверы по `provisionedVia === 'aeza'` (или по непустому aeza id) в рамках organization + план Free.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Миграция создана; типы Drizzle обновлены</done>
</task>

<task type="auto">
  <name>Task 2: Сервис Aeza + SSH + create server reuse</name>
  <files>packages/server/src/ (новый модуль aeza или аналог), apps/dokploy/src/server/api/routers/onboarding.ts</files>
  <action>Реализовать: после успешной оплаты (callback/webhook или статус платежа — по существующему billing-потоку) сгенерировать SSH key pair, сохранить в существующую модель ssh keys организации, вызвать Aeza API для заказа VPS в Москве, по готовности IP вызвать ту же логику, что `server.create`, чтобы запись появилась в Dokploy. Ошибки — TRPCError с понятным кодом. Не хардкодить секреты.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Единый путь создания записи server после Aeza</done>
</task>

<task type="auto">
  <name>Task 3: tRPC createAezaServer + getServerStatus + лимит</name>
  <files>apps/dokploy/src/server/api/routers/onboarding.ts</files>
  <action>Экспортировать `onboarding.createAezaServer` и `onboarding.getServerStatus`. В `createAezaServer` до оплаты/создания проверить: cloud, план Free → не более одного сервера с меткой Aeza на организацию; Pro/Agency — по правилам продукта из спецификации (карточки доступны). `getServerStatus` читает состояние из БД и/или опроса Aeza (не блокировать event loop длинными запросами — короткий timeout + клиентский poll 5s). `complete` уже есть — не ломать.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Процедуры видны в appRouter; лимит enforced на сервере</done>
</task>

</tasks>

<verification>
typecheck; при наличии тестов роутера — расширить.
</verification>

<success_criteria>
Клиент сможет вызывать createAezaServer/getServerStatus; Free не обходит лимит второго Aeza-сервера.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-02-SUMMARY.md`
</output>
