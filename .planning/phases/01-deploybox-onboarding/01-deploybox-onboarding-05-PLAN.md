---
phase: 01-deploybox-onboarding
plan: 05
type: execute
wave: 4
depends_on:
  - "03"
files_modified:
  - apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx
  - apps/dokploy/src/components/onboarding/onboarding-repo-connect.tsx
autonomous: true
requirements:
  - ONB-07
user_setup: []
must_haves:
  truths:
    - "Пользователь может подключить GitHub/GitLab/Bitbucket/Gitea из шага 2"
    - "Выбор owner/repo/branch обновляет draft без фиктивного applicationId"
  artifacts:
    - path: apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx
      provides: "Композиция провайдеров + выбор репозитория"
  key_links:
    - from: onboarding-step-repository
      to: api.github.getGithubRepositories / gitlab / bitbucket / gitea аналоги
      via: выбранный provider id из draft
---

<objective>
Шаг 2 «Репозиторий»: встроить существующие компоненты подключения git-провайдеров и выбор репозитория/ветки без перехода на другие страницы и без `applicationId="asd"`.

Purpose: ONB-07; устранить заглушку в текущем `OnboardingStepRepository`.
Output: Новый тонкий модуль (например `onboarding-repo-connect.tsx`) при необходимости + обновлённый шаг 2.
</objective>

<execution_context>
@D:/Project/Main/dokploy/.cursor/get-shit-done/workflows/execute-plan.md
@D:/Project/Main/dokploy/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
**Уже существующие компоненты подключения аккаунтов:**

- `apps/dokploy/src/components/dashboard/settings/git/github/add-github-provider.tsx` — `AddGithubProvider`
- `apps/dokploy/src/components/dashboard/settings/git/gitlab/add-gitlab-provider.tsx` — `AddGitlabProvider`
- `apps/dokploy/src/components/dashboard/settings/git/bitbucket/add-bitbucket-provider.tsx` — `AddBitbucketProvider`
- `apps/dokploy/src/components/dashboard/settings/git/gitea/add-gitea-provider.tsx` — `AddGiteaProvider`
- `apps/dokploy/src/components/dashboard/settings/git/show-git-providers.tsx` — `ShowGitProviders`

**Паттерн выбора репо после подключения (с приложением):**

- `apps/dokploy/src/components/dashboard/application/general/generic/provider-source-tabs.tsx` — `ProviderSourceTabs`
- `apps/dokploy/src/components/dashboard/application/general/generic/show.tsx` — `ShowProviderForm` требует валидный `applicationId` и `api.application.one` — для онбординга не использовать с подставным id.

**tRPC для списков без приложения:**

- `apps/dokploy/src/server/api/routers/github.ts` — `getGithubRepositories`, `getGithubBranches`
- Аналоги для gitlab/bitbucket/gitea — найти в соответствующих роутерах (`grep getGitlabRepositories` и т.д.)

**Действие:** Скомпоновать `ShowGitProviders` + кнопки Add* + онбординг-специфичный селектор репозитория/ветки, копируя UX из `ProviderSourceTabs`, но с данными в `OnboardingDraft` (`provider`, `providerIntegrationId`, `owner`, `repositoryName`, `branch`, поля GitLab).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Разметка шага — провайдеры</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx</files>
  <action>Вставить `ShowGitProviders` и ряд кнопок `AddGithubProvider`, `AddGitlabProvider`, `AddBitbucketProvider`, `AddGiteaProvider` (как на странице настроек). Убрать `ShowProviderForm` с `applicationId={'asd'}`. Обеспечить отступы и заголовок шага через i18n.</action>
  <verify>
    <automated>pnpm exec biome check apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx</automated>
  </verify>
  <done>Нет фиктивного applicationId на шаге 2</done>
</task>

<task type="auto">
  <name>Task 2: Онбординг-селектор репозитория и ветки</name>
  <files>apps/dokploy/src/components/onboarding/onboarding-repo-connect.tsx, apps/dokploy/src/components/onboarding/onboarding-step-repository.tsx, apps/dokploy/src/components/onboarding/onboarding-draft-types.ts</files>
  <action>Создать компонент (или расширить шаг), который после выбора типа провайдера и id интеграции подгружает список репозиториев и веток через существующие tRPC процедуры (те же, что использует `ProviderSourceTabs` / save-* providers). Записывать результат в `onChange` draft. Поддержать github/gitlab/bitbucket/gitea с минимальным дублированием (общий хук `useOnboardingRepoSelection`). Обработать loading/error/empty states по паттернам проекта.</action>
  <verify>
    <automated>pnpm run typecheck</automated>
  </verify>
  <done>draft заполняется достаточно для деплоя на шаге 4 (после рефактора split)</done>
</task>

</tasks>

<verification>
`pnpm run typecheck`
</verification>

<success_criteria>
Шаг 2 полностью внутри визарда; подключение и выбор репо работают через существующие API.
</success_criteria>

<output>
После выполнения создать `.planning/phases/01-deploybox-onboarding/01-deploybox-onboarding-05-SUMMARY.md`
</output>
