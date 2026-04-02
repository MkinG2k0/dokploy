---
phase: 01-deploybox-onboarding
plan: 06
type: execute
wave: 5
depends_on:
  - "04"
  - "05"
files_modified:
  - apps/dokploy/src/components/onboarding/onboarding-step-settings.tsx
  - apps/dokploy/src/components/onboarding/onboarding-step-deploy.tsx
  - apps/dokploy/src/components/onboarding/onboarding-next-actions.tsx
  - apps/dokploy/src/components/onboarding/onboarding-deploy-log.tsx
  - apps/dokploy/src/components/onboarding/onboarding-wizard.tsx
  - apps/dokploy/src/i18n/locales/ru/onboarding-wizard.json
  - apps/dokploy/src/i18n/locales/en/onboarding-wizard.json
autonomous: true
requirements:
  - ONB-08
  - ONB-09
  - ONB-11
user_setup: []
must_haves:
  truths:
    - "Шаг 3 создаёт/обновляет проект и приложение и настройки до деплоя; шаг 4 запускает деплой и показывает логи"
    - "Тестовый режим: мок-лог, без реального deploy"
    - "What's next: первая карточка «Подключить реальный сервер» в тесте; PostgreSQL/domain/Telegram/backups с бейджами free по спецификации"
  artifacts:
    - path: apps/dokploy/src/components/onboarding/onboarding-next-actions.tsx
      provides: "Карточки после деплоя"
  key_links:
    - from: onboarding-step-deploy
      to: api.application.deploy
      via: только реальный сервер
---

<objective>
Завершить поток: шаг 3 встраивает создание проекта/сервиса и конфигурацию; шаг 4 — деплой и логи; экран What's next по спецификации; согласовать `canGoNext` с шагом 2 после выбора репо.

Purpose: ONB-08, ONB-09, ONB-11; разделение create vs deploy; тестовый мок.
Output: Обновлённые step-settings, step-deploy, next-actions, при необходимости лёгкий mock-компонент лога.
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
**Референс создания приложения:**

- `apps/dokploy/src/components/dashboard/project/add-application.tsx` — форма имени, appName, serverId; `api.application.create`
- Проект: `api.project.create` (уже в `onboarding-step-deploy.tsx` runPipeline)

**Логи деплоя (прод):**

- `apps/dokploy/src/components/onboarding/onboarding-deploy-log.tsx` — WebSocket `/listen-deployment` (в спецификации указано SSE; в кодовой базе используется WebSocket — **сохранить WebSocket**, в SUMMARY отметить расхождение с формулировкой «SSE»).

**Текущая проблема:** весь pipeline в `runPipeline` на шаге 4 — перенести создание проекта/приложения/git/build/env/domain на шаг 3 (кнопка «Сохранить и продолжить» или автосейв при Next), шаг 4 оставить `deploy` + стрим лога + финальный экран.

**What's next сейчас:** `onboarding-next-actions.tsx` помечает Telegram и backups как Pro — по спецификации пользователя сделать **free** (badge), порядок: тест-mode highlight «Подключить реальный сервер», затем PostgreSQL, custom domain, Telegram, DB autobackups.

**Визард:** Проверить `canRepoNext` на шаге 2 после реализации плана 05; `canSettingsNext` на шаге 3.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Шаг 3 — проект + приложение + настройки (embed)</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-settings.tsx, apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</files>
  <action>Встроить паттерн из `add-application.tsx` и сохранений git/build/env/domain, сейчас выполняемых в `runPipeline` (`onboarding-step-deploy.tsx`), так чтобы при переходе Next с шага 3 (или по CTA на шаге 3) в БД существовали `project`, `application` с привязкой к `draft.serverId`, провайдер репозитория, build type, env, домен (как в текущем pipeline). Можно выделить хук `useOnboardingProvision` для мутаций. При `skippedRepo` — пропуск создания git-привязки (как сейчас для deploy skipped). Обновить `canSettingsNext`. Не дублировать создание при повторном входе на шаг 3 — идемпотентность через draft.projectId/applicationId.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>После шага 3 в draft присутствуют projectId, applicationId при нормальном потоке</done>
</task>

<task type="auto">
  <name>Task 2: Шаг 4 — deploy, логи, тестовый мок</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-deploy.tsx, apps/dokploy/src/components/onboarding/onboarding-deploy-log.tsx</files>
  <action>Упростить шаг 4: вызвать только `api.application.deploy` (и получение logPath через `utils.deployment.all` как сейчас) когда не тестовый режим. Для `draft.testServerMode`: не вызывать deploy; показать тот же Progress и статический мок-лог (новый компонент или массив строк + `TerminalLine`); затем показать What's next. Опционально: интервал poll статуса Aeza не относится к этому шагу — уже на шаге 1.</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-step-deploy.tsx</automated>
  </verify>
  <done>Реальный и тестовый сценарии различаются; WebSocket лог только для реального деплоя</done>
</task>

<task type="auto">
  <name>Task 3: What's next + CTA + canRepoNext</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-next-actions.tsx, apps/dokploy/src/components/onboarding/onboarding-wizard.tsx, apps/dokploy/src/i18n/locales/ru/onboarding-wizard.json, apps/dokploy/src/i18n/locales/en/onboarding-wizard.json</files>
  <action>Обновить `OnboardingNextActions`: принять `testServerMode?: boolean`. В тесте: первая карточка «Подключить реальный сервер» (highlight), кнопки [Купить VPS Aeza] (ссылка на поток Aeza/биллинг) и [Подключить свой VPS] (фокус на шаг 1 или модалка HandleServers — на усмотрение, без поломки UX). Остальные карточки: PostgreSQL, custom domain, Telegram, DB autobackups — бейдж **free** по спецификации. Убрать блокировки Pro для этих четырёх, если спецификация требует free. Проверить и поправить `canRepoNext`/`canSettingsNext`/`canDeployNext` в `onboarding-wizard.tsx` после изменений шагов 2–3.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Экран соответствует копирайту; визард не пускает Next без нужных полей</done>
</task>

</tasks>

<verification>
`pnpm run typecheck`; при возможности ручной smoke-тест визарда в cloud-режиме.
</verification>

<success_criteria>
Создание и деплой разведены по шагам 3 и 4; тестовый мок работает; What's next обновлён.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-06-SUMMARY.md`
</output>
