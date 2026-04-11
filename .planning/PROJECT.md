# Dokploy — доработка онбординга (DeployBox)

## What This Is

В этом репозитории дорабатывается **страница и флоу онбординга** Dokploy / DeployBox: четырёхшаговый визард (сервер → репозиторий → настройка → деплой) на базе существующих компонентов приложения. Работа ведётся в **brownfield**-монорепо (Next.js + tRPC + `@dokploy/server`); планирование по фазе **DeployBox onboarding** зафиксировано в `.planning/ROADMAP.md`.

## Core Value

Пользователь **проходит все шаги онбординга end-to-end без тупиков**; ближайший инкремент — стабильный сценарий с **тестовым сервером**, затем остальные шаги. Поведение должно быть согласовано в **обоих режимах**: cloud (`IS_CLOUD`) и self-hosted.

## Requirements

### Validated

- ✓ **Монорепо и приложение Dokploy** — Next.js (Pages Router) в `apps/dokploy`, общий домен в `packages/server`, tRPC API и Better Auth — *existing*
- ✓ **Слои UI → tRPC → сервисы** — страницы и компоненты в `apps/dokploy/src/pages/`, `apps/dokploy/src/components/`, роутеры в `apps/dokploy/src/server/api/routers/` — *existing*
- ✓ **Онбординг как область UI** — компоненты под `apps/dokploy/src/components/onboarding/` — *existing*
- ✓ **Разделение cloud / non-cloud** — хост-процесс и воркеры деплоя в `apps/dokploy/src/server/server.ts` (ветвление по cloud) — *existing*
- ✓ **Карта кодовой базы** — `.planning/codebase/*.md` — *2026-04-11*

### Active

- [ ] **Страница онбординга** — доработка UI/поведения визарда в соответствии с целевым UX
- [ ] **Тестовый сервер** — создание и прохождение шага 1 с тестовым сервером (включая согласованность с ONB-04, ONB-06)
- [ ] **Полный пользовательский флоу** — проверка и исправление цепочки шагов 1→4 (Server → Repo → Setup → Deploy) в cloud и self-hosted
- [ ] **Согласование с ROADMAP** — требования ONB-01 … ONB-12 из `.planning/ROADMAP.md` закрываются реализацией и проверкой

### Out of Scope

- Полная замена стека или миграция с Next Pages — не цель этой инициативы
- Новые крупные фичи вне онбординга (биллинг, несвязанные дашборды) — unless явно выведены в отдельную фазу

## Context

- План фазы и глоссарий требований: `.planning/ROADMAP.md` (Phase 01, ONB-01 … ONB-12).
- Архитектура и стек: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`.
- Текущее состояние планирования: `.planning/STATE.md` указывает фазу `01-deploybox-onboarding` и готовность к execute-phase.
- Пользовательский приоритет: сначала ветка **с тестовым сервером**, затем остальные шаги; оба варианта деплоя (cloud и self-hosted) должны оставаться рабочими.

## Constraints

- **Платформа:** учёт `IS_CLOUD` и self-hosted при любых изменениях редиректов, tRPC и UI.
- **Стек:** сохранять принятые в репозитории паттерны (tRPC, React Query, существующие компоненты подключения Git и серверов).
- **Совместимость:** не ломать существующие сценарии Aeza / add-server / деплоя без явной необходимости; изменения — инкрементальные.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Фокус: тестовый сервер первым | Пользовательский приоритет для ближайшей доставки | — Pending |
| Оба режима: cloud и self-hosted | Явное требование проверки флоу в обоих вариантах | — Pending |
| Опора на существующий ROADMAP | ONB-* уже согласованы в `.planning/ROADMAP.md` | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after initialization*
