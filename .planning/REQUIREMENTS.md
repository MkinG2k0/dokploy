# Requirements: Dokploy — доработка онбординга

**Defined:** 2026-04-11  
**Core Value:** Пользователь проходит все шаги онбординга end-to-end без тупиков; первым доводится сценарий с тестовым сервером; поведение согласовано в cloud и self-hosted.

## v1 Requirements

Требования синхронизированы с глоссарием ONB в `.planning/ROADMAP.md` (Phase 01).

### Навигация и состояние визарда

- [ ] **ONB-01**: Пока `onboardingCompleted === false`, пользователь перенаправляется на `/onboarding`; после завершения онбординга попадает на дашборд
- [ ] **ONB-02**: В `localStorage` сохраняется только состояние шага: `{ step: 1 | 2 | 3 | 4 }`
- [ ] **ONB-03**: Порядок шагов: Server → Repo → Setup → Deploy; сайдбар отражает прогресс; Back/Next; Skip только на шагах 2–3; можно перейти к уже завершённому шагу по клику

### Шаг 1 — сервер

- [ ] **ONB-04**: Шаг 1: карточки Aeza, свой VPS через встроенный add-server UI, выбор/создание тестового сервера по имени
- [ ] **ONB-05**: Aeza: оплата T-Bank (существующий механизм), SSH, API Aeza, индикация прогресса, добавление сервера через существующую логику

### Тестовый режим и деплой

- [ ] **ONB-06**: Тестовый режим: заметный баннер; на шаге 4 — мок-логи деплоя там, где предусмотрено сценарием

### Шаг 2 — репозиторий

- [ ] **ONB-07**: Шаг 2: встроенный connect Git (GitHub / GitLab / Bitbucket / Gitea) без ухода на несвязанные страницы визарда

### Шаг 3 — настройка

- [ ] **ONB-08**: Шаг 3: проект и сервис, автозаполнение полей, шаг можно пропустить (skippable)

### Шаг 4 — деплой и завершение

- [ ] **ONB-09**: Шаг 4: запуск деплоя, стриминг логов (существующий механизм), прогресс, блок «What's next»
- [ ] **ONB-11**: Экран «What's next»: карточки и CTA по спецификации фазы

### API и лимиты

- [ ] **ONB-10**: tRPC-процедуры для онбординга: `complete`, `createAezaServer`, `getServerStatus` (и согласованное поведение с UI)
- [ ] **ONB-12**: Для тарифа Free — не более одного Aeza-сервера; ограничение применяется на уровне tRPC

## v2 Requirements

(Пока не выносим — при появлении отдельной фазы дополнить.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Смена стека (не Next/tRPC) | Вне целей доработки онбординга |
| Новые продуктовые фичи вне визарда | Отдельные фазы в ROADMAP |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONB-01 | Phase 01 | Pending |
| ONB-02 | Phase 01 | Pending |
| ONB-03 | Phase 01 | Pending |
| ONB-04 | Phase 01 | Pending |
| ONB-05 | Phase 01 | Pending |
| ONB-06 | Phase 01 | Pending |
| ONB-07 | Phase 01 | Pending |
| ONB-08 | Phase 01 | Pending |
| ONB-09 | Phase 01 | Pending |
| ONB-10 | Phase 01 | Pending |
| ONB-11 | Phase 01 | Pending |
| ONB-12 | Phase 01 | Pending |

**Coverage:**

- v1 requirements: 12 total  
- Mapped to phases: 12  
- Unmapped: 0 ✓  

---
*Requirements defined: 2026-04-11*  
*Last updated: 2026-04-11 after initialization (из глоссария ROADMAP)*
