---
phase: 01-deploybox-onboarding
plan: 04
type: execute
wave: 4
depends_on:
  - "02"
  - "03"
files_modified:
  - apps/dokploy/src/components/onboarding/onboarding-step-server.tsx
  - apps/dokploy/src/components/dashboard/settings/servers/handle-servers.tsx
autonomous: true
requirements:
  - ONB-04
user_setup: []
must_haves:
  truths:
    - "Свой VPS: форма добавления сервера открыта внутри шага, без router.push на /dashboard/settings/servers"
    - "Карточки MSKs-1/2/3 с ценами; MSKs-2 popular"
    - "Выбор тестового сервера по имени «Тестовый сервер» выставляет test mode"
  artifacts:
    - path: apps/dokploy/src/components/onboarding/onboarding-step-server.tsx
      provides: "Композиция HandleServers + Aeza + select servers"
  key_links:
    - from: OnboardingStepServer
      to: api.server.withSSHKey
      via: список серверов
---

<objective>
Реализовать шаг 1 «Сервер»: встроить существующий UI добавления сервера по SSH, карточки Aeza с оплатой и созданием через план 02, опцию тестового сервера.

Purpose: ONB-04 и запрет ухода на отдельные страницы (NON-NEGOTIABLE).
Output: Обновлённый `onboarding-step-server.tsx`; при необходимости лёгкие props у `HandleServers` для embedded-режима.
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
**Встраиваемый компонент (свой VPS):**

- `apps/dokploy/src/components/dashboard/settings/servers/handle-servers.tsx` — экспорт `HandleServers`; диалог с формой IP/port/username/sshKeyId; мутация `api.server.create`.

**Список серверов:**

- `api.server.withSSHKey` уже используется в шаге.

**Aeza:**

- После плана 02 вызывать `api.onboarding.createAezaServer.useMutation` с тарифом; показывать прогресс «Создаём сервер в Москве…» 30–60 с с `getServerStatus` poll каждые 5 с до готовности; по успеху проставить `draft.serverId` и автоматически `goStep(2)` (через callback `onServerReady` из визарда — добавить prop в шаг 1).

**Тестовый сервер:**

- Найти в `servers` запись с `name === 'Тестовый сервер'` (точное совпадение); по выбору вызвать `onChange({ serverId, testServerMode: true })` (поле из плана 03 в draft).

**Удалить:** `Link href="/dashboard/settings/servers"` и внешние ссылки как основной путь — заменить на `HandleServers`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Встроить HandleServers в шаг 1</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-server.tsx, apps/dokploy/src/components/dashboard/settings/servers/handle-servers.tsx</files>
  <action>Импортировать и отрендерить `HandleServers` внутри карточки шага (без изменения маршрута). При необходимости добавить props: `variant="embedded"`, `onCreated?: (serverId: string) => void` — после успешного `server.create` инвалидировать `withSSHKey`, вызвать `onChange({ serverId })` и опционально закрыть диалог. Сохранить текущие стили shadcn/Tailwind проекта.</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-step-server.tsx apps/dokploy/src/components/dashboard/settings/servers/handle-servers.tsx</automated>
  </verify>
  <done>Добавление своего VPS возможно не покидая визард</done>
</task>

<task type="auto">
  <name>Task 2: Aeza карточки + поток оплаты и прогресс</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-server.tsx</files>
  <action>Отобразить три карточки MSKs-1 (540₽), MSKs-2 (1090₽, popular), MSKs-3 (2160₽). Для Free: оплата через существующий billing/T-Bank (интеграция из плана 02); после успеха — цепочка SSH + VPS + poll `getServerStatus` каждые 5 с. Текст прогресса: «Создаём сервер в Москве…». По готовности — установить serverId в draft и уведомить родителя для автоперехода на шаг 2. Убрать требование Pro только для показа карточек, если спецификация требует Aeza на Free с лимитом (согласовать с `onboarding.getContext`: лимит в tRPC, не в UI заглушке).</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Мутации и poll подключены к UI; ошибки показываются через toast</done>
</task>

<task type="auto">
  <name>Task 3: Тестовый сервер в select</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-server.tsx, apps/dokploy/src/components/onboarding/onboarding-draft-types.ts</files>
  <action>Явная опция или выбор из списка: сервер с именем «Тестовый сервер». При выборе: `onChange({ serverId, testServerMode: true })`; не создавать платёж. Если сервера нет в БД — документировать seed/админ-шаг в SUMMARY (создание тестового сервера для org).</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-step-server.tsx</automated>
  </verify>
  <done>Тестовый режим активируется выбором тестового сервера</done>
</task>

</tasks>

<verification>
typecheck + biome на изменённых файлах.
</verification>

<success_criteria>
Шаг 1 не использует router.push для основных сценариев; Aeza и тестовый путь работают согласно спецификации.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-04-SUMMARY.md`
</output>
