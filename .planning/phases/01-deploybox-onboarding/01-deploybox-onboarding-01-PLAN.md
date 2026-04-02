---
phase: 01-deploybox-onboarding
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/dokploy/src/pages/onboarding.tsx
  - apps/dokploy/src/components/onboarding/onboarding-storage.ts
  - apps/dokploy/src/components/onboarding/onboarding-wizard.tsx
  - apps/dokploy/src/server/api/routers/onboarding.ts
autonomous: true
requirements:
  - ONB-01
  - ONB-02
user_setup: []
must_haves:
  truths:
    - "Неавторизованный пользователь не попадает на /onboarding без логина"
    - "Завершивший онбординг пользователь с /onboarding перенаправляется на дашборд"
    - "В localStorage сохраняется только номер шага 1–4 (новый ключ версии)"
  artifacts:
    - path: apps/dokploy/src/components/onboarding/onboarding-storage.ts
      provides: "Только step в persisted state"
    - path: apps/dokploy/src/pages/onboarding.tsx
      provides: "GSSP без автосоздания First Project"
  key_links:
    - from: apps/dokploy/src/pages/onboarding.tsx
      to: getOnboardingPageRedirect
      via: validateRequest + redirect
---

<objective>
Убрать временную логику автосоздания проекта в GSSP, зафиксировать контракт персистенции шага (только `step` в localStorage), подготовить `onboarding` router к расширению без привязки к bootstrap `First Project`.

Purpose: Соответствие спецификации и отсутствие скрытых побочных эффектов при входе на страницу визарда.
Output: Чистый вход на `/onboarding`, storage v2, упрощённый `getStatus` (без обязательного bootstrap project).
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md

Текущее состояние:

- `packages/server/src/db/schema/user.ts` — поля `onboardingCompleted`, `onboardingStep` уже есть; отдельная миграция не требуется, если колонки уже применены в БД.
- `apps/dokploy/src/server/utils/onboarding-redirect.ts` — редиректы для cloud уже реализованы.
- `apps/dokploy/src/pages/onboarding.tsx` — содержит автосоздание `First Project` и закомментированный TODO редиректа.

Интерфейсы:

```typescript
// onboarding-storage — расширить/заменить контракт persisted
export interface OnboardingStoredStateV2 {
  step: number; // 1–4
}
```

```typescript
// onboarding.getStatus — упростить ответ при необходимости
// Сейчас возвращает bootstrapProjectId по имени "First Project" — убрать или заменить на явный optional project из шага 3
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: localStorage только step (v2)</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-storage.ts, apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</files>
  <action>Ввести новый ключ (например `deploybox-onboarding-step-v2`) и тип, хранящий только `step: 1|2|3|4`. Удалить сериализацию `draft` в localStorage; весь draft остаётся в React state и при перезагрузке восстанавливается только шаг (и при необходимости с сервера через существующие `getStatus`/`saveProgress`). Обновить `load`/`save`/`clear` и все вызовы в визарде. Не ломать SSR: guard `typeof window`.</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-storage.ts apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</automated>
  </verify>
  <done>localStorage не содержит полей draft; шаг восстанавливается после F5</done>
</task>

<task type="auto">
  <name>Task 2: Очистить GSSP onboarding page</name>
  <files>apps/dokploy/src/pages/onboarding.tsx</files>
  <action>Убрать создание `First Project` и вызов `caller.project.create` из `getServerSideProps`. Оставить: проверка сессии, редирект неавторизованных, `getOnboardingPageRedirect` для уже завершивших онбординг. Возвращать `{ props: {} }` без побочных мутаций БД.</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/pages/onboarding.tsx</automated>
  </verify>
  <done>GSSP не мутирует projects при загрузке страницы</done>
</task>

<task type="auto">
  <name>Task 3: Упростить onboarding.getStatus</name>
  <files>apps/dokploy/src/server/api/routers/onboarding.ts, apps/dokploy/src/components/onboarding/onboarding-wizard.tsx</files>
  <action>Убрать поиск bootstrap проекта по имени `First Project` из `getStatus` (или заменить на опциональный `projectId` из явного поля пользователя/черна, если понадобится в плане 06). Обновить клиент визарда: не ожидать `bootstrapProjectId` из этого источника. Сохранить `onboardingStep` и `onboardingCompleted` как сейчас.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>getStatus не зависит от магического имени проекта; typecheck проходит</done>
</task>

</tasks>

<verification>
`pnpm run typecheck` с корня; при необходимости `pnpm --filter=dokploy run test`.
</verification>

<success_criteria>
Нет скрытого создания проекта; localStorage хранит только шаг; типы и линтер согласованы.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-01-SUMMARY.md`
</output>
