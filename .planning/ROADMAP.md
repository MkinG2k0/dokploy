# Roadmap — DeployBox onboarding

## Phase 01: DeployBox onboarding wizard

**Goal:** Пользователь проходит 4 шага (сервер → репозиторий → настройка → деплой) внутри визарда с встраиванием существующих компонентов Dokploy, без ухода на отдельные страницы; тестовый сервер и мок-деплой; Aeza + лимиты на сервере.

**Requirements:** `[ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06, ONB-07, ONB-08, ONB-09, ONB-10, ONB-11, ONB-12]`

**Plans:** 6 plans

Plans:

- [ ] `01-deploybox-onboarding-01-PLAN.md` — Редиректы, GSSP, localStorage только step, упрощение getStatus
- [ ] `01-deploybox-onboarding-02-PLAN.md` — tRPC: Aeza, статус VPS, лимит Free 1 Aeza-сервер
- [ ] `01-deploybox-onboarding-03-PLAN.md` — Порядок шагов 1–4, навигация, skip, баннер тест-режима
- [ ] `01-deploybox-onboarding-04-PLAN.md` — Шаг 1: HandleServers, Aeza, тестовый сервер
- [ ] `01-deploybox-onboarding-05-PLAN.md` — Шаг 2: провайдеры + выбор репо без applicationId
- [ ] `01-deploybox-onboarding-06-PLAN.md` — Шаги 3–4, сплит create/deploy, What's next

### Requirement glossary

| ID | Описание |
|----|----------|
| ONB-01 | `onboardingCompleted === false` → редирект на `/onboarding`; по завершении → дашборд |
| ONB-02 | localStorage только `{ step: 1\|2\|3\|4 }` |
| ONB-03 | Порядок шагов: Server → Repo → Setup → Deploy; сайдбар ✓; Back/Next; Skip только 2–3; клик по завершённому шагу |
| ONB-04 | Шаг 1: Aeza карточки, свой VPS через встроенный add-server UI, тестовый сервер по имени |
| ONB-05 | Aeza: оплата T-Bank (существующий механизм), SSH, API Aeza, прогресс, add server через существующую логику |
| ONB-06 | Тестовый режим: баннер, шаг 4 мок-лог |
| ONB-07 | Шаг 2: встроить connect Git (GitHub/GitLab/Bitbucket/Gitea) |
| ONB-08 | Шаг 3: проект + сервис, автозаполнение, skippable |
| ONB-09 | Шаг 4: деплой, стриминг логов (существующий механизм), прогресс, What's next |
| ONB-10 | tRPC: `complete`, `createAezaServer`, `getServerStatus` |
| ONB-11 | Экран What's next: карточки и CTA по спецификации |
| ONB-12 | Лимит 1 Aeza-сервер (Free) только в tRPC |
