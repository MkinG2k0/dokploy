---
phase: 01-deploybox-onboarding
plan: 03
type: execute
wave: 3
depends_on:
  - "01"
files_modified:
  - apps/dokploy/src/components/onboarding/onboarding-wizard.tsx
  - apps/dokploy/src/components/onboarding/onboarding-wizard-shell.tsx
  - apps/dokploy/src/components/onboarding/onboarding-draft-types.ts
  - apps/dokploy/src/i18n/locales/ru/onboarding-wizard.json
  - apps/dokploy/src/i18n/locales/en/onboarding-wizard.json
autonomous: true
requirements:
  - ONB-03
  - ONB-06
user_setup: []
must_haves:
  truths:
    - "Шаг 1 = сервер, 2 = репозиторий, 3 = настройка, 4 = деплой"
    - "Skip виден только на шагах 2 и 3"
    - "Шаги 1 и 4 нельзя пропустить"
    - "Клик по завершённому шагу в сайдбаре возвращает к нему (в пределах maxReachable)"
  artifacts:
    - path: apps/dokploy/src/components/onboarding/onboarding-wizard-shell.tsx
      provides: "Лейблы шагов и баннер тест-режима"
  key_links:
    - from: onboarding-wizard.tsx
      to: onboarding-wizard-shell.tsx
      via: props currentStep, onStepClick, showSkip
---

<objective>
Выровнять каркас визарда со спецификацией: порядок шагов, навигация, правила Skip/Next/Back, отображение тестового режима на всём визарде.

Purpose: Единая оболочка для встраиваемых шагов без router.push на сторонние страницы.
Output: Обновлённые `OnboardingWizard`, `OnboardingWizardShell`, типы draft для `isTestServer`/`testMode`, строки i18n.
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
Текущий баг/рассинхрон: в `onboarding-wizard.tsx` шаг 1 ренерит `OnboardingStepRepository`, шаг 2 — `OnboardingStepServer` (обратно спецификации). `handleSkip` срабатывает только при `step === 1` — должно быть для шагов 2–3. `showSkip` привязан к `step === 1` — исправить.

Файлы для ориентира:

- `apps/dokploy/src/components/onboarding/onboarding-wizard.tsx` (строки 126–158, 188–199)
- `apps/dokploy/src/components/onboarding/onboarding-wizard-shell.tsx` — сейчас `stepRepo` для id 1, `stepServer` для id 2

Заголовок шага 1 по спецификации (RU): «Добро пожаловать в DeployBox. Выбери сервер для твоих проектов» — вынести в i18n.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Порядок шагов и условия Next/Skip/Back</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</files>
  <action>Поменять порядок: step 1 → `OnboardingStepServer`, 2 → `OnboardingStepRepository`, 3 → `OnboardingStepSettings`, 4 → `OnboardingStepDeploy`. Исправить `handleNext`/`handleBack` с учётом `step3Skipped` (пропуск настройки после репо). `showSkip === (step === 2 || step === 3)`. `handleSkip`: на шаге 2 выставить `skippedRepo` и перейти к 3 или 4 по правилам продукта; на шаге 3 — пометить skipped settings и перейти на 4 (добавить поля draft при необходимости). Убрать логику skip только с шага 1. Обновить `canGoNext`/`canRepoNext`/`canServerNext`/`canSettingsNext` под новый порядок (сервер первый: `canServerNext` для шага 1, репо для шага 2, и т.д.).</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</automated>
  </verify>
  <done>Навигация соответствует ONB-03; skip только на 2–3</done>
</task>

<task type="auto">
  <name>Task 2: Shell — сайдбар, прогресс, баннер</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-wizard-shell.tsx, apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</files>
  <action>Обновить подписи шагов в сайдбаре: 1 Сервер, 2 Репозиторий, 3 Настройка, 4 Деплой. Сохранить зелёные галочки для завершённых шагов и блокировку будущих. Добавить prop `testMode?: boolean` (или `bannerMessage`) для баннера на всю ширину контента: «Тестовый режим — деплой недоступен» при выборе тестового сервера (флаг из draft, выставляется в плане 04). Верхний progress bar оставить как есть (уже есть).</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-wizard-shell.tsx</automated>
  </verify>
  <done>Сайдбар отражает новый порядок; баннер управляется снаружи</done>
</task>

<task type="auto">
  <name>Task 3: i18n RU/EN для визарда</name>
  <files>apps/dokploy/src/i18n/locales/ru/onboarding-wizard.json, apps/dokploy/src/i18n/locales/en/onboarding-wizard.json</files>
  <action>Добавить/обновить ключи для заголовков шагов, баннера тест-режима, кнопок. Русские строки — по спецификации пользователя; EN — эквивалентные.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>Нет отсутствующих ключей в используемых t('...')</done>
</task>

</tasks>

<verification>
`pnpm run typecheck` с корня репозитория.
</verification>

<success_criteria>
Визард визуально и логически следует порядку Server→Repo→Setup→Deploy; skip только 2–3.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-03-SUMMARY.md`
</output>
