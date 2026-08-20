# ELIO: независимый аудит продукта и архитектуры

Дата: 21 августа 2026

Аудируемая ветка: `codex/supabase-data-layer`

Локальный commit: `617c5f1926fe09c7c6303a4a93f1d167b7c36c7e`

Опубликованный эквивалент data-layer: `6830c8d39f4fcaaad55715db4eac5f39a2760963`

Production/default branch на GitHub: `main`, commit `59810c2796aeab231aaad8dc5f56e378b761a7b1`

## 1. Результат аудита

Репозиторий уже не является только техническим каркасом «Пятёрки». В нём есть значимый ELIO foundation: новый публичный визуальный язык, полноценный сохраняемый onboarding, реальный student vertical slice, scoped staff editor, Supabase learning state, родительская безопасная агрегация и проверяемая платёжная граница ЮKassa.

Backend переписывать не нужно. Основная архитектура — совместимый модульный монолит Next.js + Supabase — соответствует задаче. Следующий этап должен завершать продуктовые вертикали поверх текущих контрактов, а не заменять их.

Ветка при этом **не готова к `main`**:

1. GitHub CI у data-layer commit красный: `verify` успешен, `rls` падает на некорректном ожидании fixture. Это не доказанная RLS-утечка: второй студент уже законно получает строку `student_progress` при добавлении в другую группу того же курса. Но красный security suite остаётся release blocker до исправления теста и повторного зелёного запуска.
2. На момент аудита login всегда отправлял пользователя на `/student`. В remediation-pass добавлен server-side role destination для login и password reset; до merge он должен пройти CI.
3. AI foundation хранит контекст и диалоги, однако нет `/student/ai` page, вызова модели, streaming, moderation/retention policy и пользовательского сценария. Называть AI mentor реализованным нельзя.
4. `types/database.generated.ts` отсутствует. Скрипт генерации есть, но Supabase client сейчас не использует сгенерированный database contract.
5. На момент аудита student lesson catalog строился из `lesson_id` событий расписания. В remediation-pass catalog переведён на прямое чтение доступных опубликованных lessons под RLS; до merge он должен пройти CI.
6. Activity фиксирует завершение урока, отправку ДЗ, диагностику и study session. События `lesson_started` и `homework_started` не сохраняются; resume-position предусмотрен схемой, но mutation для него отсутствует.
7. Публичный тарифный блок использует статический fallback состава пакетов при недоступной базе. Цены не выдумываются, но текст fallback может расходиться с production-настройками Supabase.

## 2. Метод и границы

Проверены git state, package/lock contracts, App Router routes, Server Components, Server Actions, Route Handlers, Supabase helpers, все migrations, RLS suite, local seed, auth, onboarding, roles, private storage, payment/webhook, email/rate limiting, Sentry, student/parent/staff flows, дизайн-документы, production checklist и legacy references.

Отдельно проверены GitHub Actions опубликованного data-layer commit через GitHub. Внешние LMS изучались только как источники паттернов; их код и архитектура в ELIO не переносились.

Визуальная проверка текущего authenticated UI в этом проходе не выполнялась: в среде нет запущенного локального Supabase с seed-сессиями. Существующий `ELIO_VISUAL_QA.md` — полезный предыдущий артефакт, но не заменяет новый production-like smoke test после исправления CI.

## 3. Подтверждённый стек

| Область | Факт по репозиторию |
|---|---|
| Runtime | Node `22.x` в `engines` и CI |
| Framework | Next.js `16.3.1`, App Router, Proxy API |
| UI | React/React DOM `19.2.6` |
| Types | TypeScript `5.9.3`, `strict: true` |
| Styles | Tailwind CSS `4.2.1` + semantic CSS tokens/modules |
| Data/Auth | `@supabase/ssr` `0.12.4`, `@supabase/supabase-js` `2.111.0`, PostgreSQL, RLS, private Storage |
| Validation | Zod `4.4.3` на server boundaries |
| Forms | native forms + Server Actions + `useActionState`; React Hook Form отсутствует и фактически не нужен текущим формам |
| Observability | Sentry `10.70.0`, структурированные event/error helpers |
| Payments | ЮKassa REST, idempotency, receipt, verified webhook |
| Email | Resend adapter, explicit production configuration errors |
| Quality | ESLint 9, Node test runner, Next production build, PostgreSQL 16 RLS CI |

## 4. Архитектура

### 4.1 Границы

- Server Components читают публичные, student, parent и staff данные.
- Server Actions принимают мутации, валидируют input через Zod, вызывают scoped Supabase queries/RPC и revalidate routes.
- Route Handlers используются для signed URL redirects и webhook ЮKassa.
- Browser получает anon/session client; `SUPABASE_SERVICE_ROLE_KEY` изолирован в `server-only` helper.
- Auth и роли проверяются сервером. UI navigation не является границей доступа.
- Бизнес-инварианты с несколькими записями и платежные переходы выполняются PostgreSQL RPC/trigger, а не цепочкой клиентских запросов.

Это правильная форма для ELIO сейчас: модульный монолит, без преждевременных microservices и multi-tenant слоя.

### 4.2 App routes

| Поверхность | Routes | Состояние |
|---|---|---|
| Public | `/`, `/start`, `/test/[subject]`, `/legal/[document]` | ELIO foundation; планы читаются из Supabase, диагностика пока использует versioned question set в TypeScript |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email` | Supabase SSR; rate limited; role-aware redirect после login отсутствует |
| Onboarding | `/onboarding`, `/onboarding/[step]` | 8 сохраняемых шагов: profile, exam, subjects, goals, schedule, parent, plan, review |
| Student | `/student`, `/student/schedule`, `/student/lessons`, `/student/lessons/[lessonId]` | Реальные Supabase данные, progress, activity, weekly goal, materials, recordings, homework |
| Payment | `/student/payment/return`, `/api/payments/yookassa/webhook` | Browser return только читает status; активация только через verified webhook |
| Parent | `/parent`, `/invite/parent` | Безопасный aggregate foundation для подтверждённых связей |
| Staff | `/teacher`, `/curator`, `/staff/learning` | Teacher/admin scoped editor; curator получает read/support foundation без academic authoring |
| Admin | `/admin` | Guarded informational foundation; полноценной admin console нет |
| Private files | `/api/materials/[materialId]`, `/api/recordings/[recordingId]` | Session + RLS + HTTPS allow-list/signed URL 60 секунд |

## 5. Database map

В migrations определены 55 public tables, одна private rate-limit table и пять compatibility/product views. Канонические существующие identifiers сохранены.

### Identity и роли

`roles`, `profiles`, `user_roles`, `student_profiles`, `parent_profiles`, `teacher_profiles`, `curator_profiles`, `parent_student_links`, `invitations`.

Роли: `student`, `parent`, `teacher`, `curator`, `admin`. Public signup может создать только `student` или `parent`; staff/admin назначаются отдельно.

### Академическое ядро

`exam_types`, `subjects`, `programs`, `modules`, `topics`, `groups`, `group_students`, `group_teachers`, `curator_students`, `lessons`, `schedule_events`, `meeting_links`, `lesson_recordings`, `lesson_attendance`, `materials`, `lesson_materials`.

### Задания и оценивание

`assignments`, `assignment_submissions`, `question_bank`, `question_answers`, `assignment_questions`, `mock_exams`, `mock_exam_assignments`, `student_score_forecasts`.

### Onboarding и цели

`student_onboarding`, `student_subjects`, `admission_goals`, `student_study_preferences`, `preferred_schedule_slots`, `onboarding_parent_drafts`, `exam_scoring_rules`, `plan_subject_limits`, `student_learning_plans`.

### Коммерция

`plans`, `plan_features`, `subscriptions`, `subscription_subjects`, `payments`.

### ELIO learning state

`student_progress`, `student_lesson_progress`, `diagnostics`, `ai_conversations`, `student_activity`, `student_weekly_goals`.

### Operations

`notifications`, `audit_logs`, `private.auth_rate_limits`.

### Product compatibility views

| Требуемое имя | Канонический источник |
|---|---|
| `courses` | `programs` + `subjects` |
| `homework` | `assignments` |
| `student_homework` | `assignment_submissions` |
| `parent_student_relation` | `parent_student_links` |
| `parent_progress_view` | confirmed relation + allow-listed progress/attendance/homework aggregates |

Такой слой совместимости предпочтительнее переименования работающих таблиц.

## 6. Migration ledger

| Migration | Назначение | Статус аудита |
|---|---|---|
| `202607310001_foundation.sql` | роли, auth trigger, академическое ядро, коммерция, private buckets, базовый RLS | immutable foundation |
| `202608010001_onboarding_stage2.sql` | onboarding drafts, scoring, preferences, plan completion, parent invitation | сохранять контракт |
| `202608010002_student_learning_stage.sql` | scoped lesson access, materials, recordings, signed-storage policies | сохранять paths/policies |
| `202608060001_rls_read_gaps.sql` | program/module/topic и relation read gaps | additive security fix |
| `202608100001_subscription_subjects_rls_helper.sql` | минимальный scoped helper | additive security fix |
| `202608120001_auth_rate_limits.sql` | постоянный DB rate limit | server-side contract |
| `202608120002_learning_authoring.sql` | staff authoring + question bank | scoped writer foundation |
| `202608120003_yookassa_payments.sql` | checkout RPC, provider attachment, verified finalization | payment contract; не переименовывать |
| `202608210001_onboarding_atomic_drafts.sql` | атомарная замена multi-row drafts | additive safety fix |
| `202608210002_rate_limit_hardening.sql` | service-role-only mutation/cleanup/index | additive safety fix |
| `202608210003_learning_data_layer.sql` | persistent progress, diagnostics, AI history, activity, views | additive ELIO layer; CI RLS suite сейчас красный |
| `202608210004_curator_authoring_authorization.sql` | отделяет curator visibility от teacher/admin academic authoring | remediation; требует зелёного RLS CI |

Старые migrations нельзя редактировать. Любое исправление после публикации должно быть новой migration, кроме исправления самого тестового fixture.

## 7. RLS и permissions

### Подтверждено

- Foundation включает RLS для всех созданных public tables; последующие таблицы включают RLS явно.
- Student видит свои профили, выборы, learning state и доступные через active group/subscription учебные объекты.
- Parent получает учебную сводку только при `confirmed` relation и не читает submission answers, diagnostics, granular activity или AI conversations.
- Teacher ограничен назначенными группами/курсами; curator — чтением по закреплённым ученикам без academic authoring; admin имеет расширенные policies.
- `question_answers` не выдаётся студенту.
- Прямая authenticated-вставка в `assignment_submissions` отозвана; отправка идёт через scoped RPC.
- `meeting_links.host_secret_ciphertext` не входит в grant authenticated.
- AI history доступна ученику и admin, но не parent/teacher/curator.

### CI blocker

Run `32403049178`:

- `verify`: success — install, typecheck, lint, 78 Node tests и build прошли.
- `rls`: failure на `supabase/tests/rls.sql:315`.

Причина по fixture: student 2 до негативного action уже состоит в group B того же published course. Trigger `group_students_initialize_progress` законно создаёт ему `student_progress`. Негативные RPC возвращают `lesson unavailable`/`assignment unavailable`, то есть scoped access срабатывает, но следующий assert ошибочно принимает существующую legitimate progress row за результат атаки.

Безопасное исправление реализовано: тест проверяет неизменность legitimate progress и отсутствие foreign submission. После публикации branch нужен новый зелёный PostgreSQL 16 прогон всех ролей.

## 8. Auth flow

1. Proxy обновляет Supabase session через cookie-aware SSR client.
2. Server guards используют `auth.getUser()`, затем читают `user_roles` под RLS.
3. Signup server-side валидирует input, ограничивает частоту, передаёт только intended role `student` и server-recomputed diagnostic snapshot.
4. Auth trigger создаёт profile, role profile и при наличии диагностический результат.
5. Незавершённый student перенаправляется в onboarding; завершённый не может повторно открыть обычный onboarding.
6. Password recovery не раскрывает наличие аккаунта.

Remediation: `login()` и `updatePassword()` используют общий server-side role destination resolver с явным приоритетом `admin` → `teacher` → `curator` → `parent` → `student`. Guards не ослаблены.

## 9. Onboarding

Onboarding уже богаче предложенной пятишаговой схемы и сохраняет каждую часть в Supabase. Сокращать его без продуктового решения не следует.

Мутации идут по цепочке UI → Server Action → Zod → Supabase/RPC → redirect. Multi-row subjects/goals/schedule заменяются атомарными RPC. Completion одной транзакцией создаёт pending subscription, subscription subjects, learning plan, optional parent invitation и audit log; idempotency обеспечивается completion key.

Оставшиеся вопросы:

- цель `повышение оценки` не представлена как самостоятельный exam/goal mode: текущая модель ориентирована на `ЕГЭ`/`ОГЭ` и admission goals;
- желаемый результат распределён между subject targets и admission goals, а не оформлен одним упрощённым шагом;
- после email-confirmation требуется end-to-end smoke test resume route и diagnostic persistence.

## 10. Learning, homework и progress

### Реализовано

- course metadata расширяет `programs`; `courses` — совместимый view;
- lesson content/order/duration/video fields добавлены без дублирования lesson table;
- completion RPC атомарно обновляет lesson progress, course progress, next stage и activity;
- homework RPC сохраняет bounded JSON answer и activity;
- dashboard, schedule, lesson details, materials, recordings, homework и weekly goal читают Supabase;
- streak и weekly points вычисляются по реальным activity dates с timezone профиля;
- честные empty/error/offline states не подставляют production mocks.

### Недостаёт

- started/resume mutation и точных событий `lesson_started`, `homework_started`;
- дополнительная группировка course-centric catalog по modules/topics; прямое чтение lessons от schedule events уже отвязано;
- полноценного lesson content renderer: `content`, `video_url`, `duration_minutes` в схеме есть, но текущий экран центрирован на live event/recording/materials;
- grading/review action для teacher;
- attendance mutation UI;
- diagnostic roadmap как рабочий student surface, а не только сохранённый snapshot/context.

## 11. AI layer

Существующий foundation безопасно собирает server-only context из progress, subjects, goals, diagnostics и homework outcomes. `saveAiConversation` валидирует bounded messages и сохраняет context snapshot.

Это только data boundary. Для production AI ещё нужны:

- provider abstraction и server-only model credentials;
- `/student/ai` route и accessible streaming UI;
- prompt/data minimization contract;
- authorization и tool allow-list для любых mutations;
- moderation, abuse/rate limits, timeout/retry/cost budgets;
- retention/delete/export policy;
- citation/source model для учебных объяснений;
- evals на корректность, безопасность и педагогический next step.

Нельзя давать модели service-role client или разрешать ей писать progress напрямую. AI mutations должны проходить те же typed Server Action/RPC boundaries.

## 12. Parent, teacher, curator, admin

| Роль | Фактическое состояние | Следующий безопасный срез |
|---|---|---|
| Parent | реальные aggregate progress/attendance/homework/recommendations; private answers/AI скрыты | child switcher, период, absence context, consent/visibility settings |
| Teacher | assigned-group authoring урока, material link, homework, question bank | review queue, grading, attendance, lesson lifecycle |
| Curator | scoped editor через assigned students/groups | student caseload, risks, interventions, notes with separate privacy model |
| Admin | role guard + informational home | users/roles/groups/subscriptions/audit CRUD с explicit permissions и audit logging |

Admin не следует «дорисовывать» статическими карточками. Нужны реальные server queries/actions и отдельный security review.

## 13. Payments и webhooks

Платёжная граница реализована корректно по основному happy path:

- price/currency/plan берутся server-side из pending subscription;
- checkout использует idempotency key и metadata internal IDs;
- ЮKassa confirmation URL принимается только по HTTPS;
- browser return не активирует подписку;
- webhook валидирует bounded payload, повторно получает payment у ЮKassa, сверяет status/paid/metadata/internal row;
- service-role RPC сверяет amount/currency и атомарно обновляет payment/subscription/audit log;
- повторный successful webhook идемпотентен.

Не реализованы refunds, recurring charges, reconciliation и операционный dispute flow. Их нельзя обещать публично. До production нужен test-mode end-to-end payment и webhook smoke test.

## 14. Private storage

Buckets `lesson-materials`, `lesson-recordings`, `student-submissions` создаются private. Material/recording handlers требуют session, читают metadata под RLS и создают signed URL на 60 секунд. External destinations проходят только через safe HTTPS parser.

Оставшиеся проверки: реальная загрузка staff/admin, object path convention, delete lifecycle, MIME/size validation, malware scanning decision и smoke test expired/revoked access. Storage paths и bucket IDs менять нельзя без отдельной migration/rollout стратегии.

## 15. Design/product audit

### Сильная foundation

- спокойная editorial палитра вместо purple-blue SaaS gradient;
- локальный Onest, ясная кириллица, semantic color roles;
- mobile pattern contract от 320 px, touch target 44 px, reduced motion/focus states;
- dashboard ставит ближайшее событие и задания выше метрик;
- пустые состояния объясняют источник будущих данных;
- публичный сайт не показывает fake testimonials, гарантии балла или выдуманные цены;
- landing и app используют общий ELIO brand surface.

### Design/UX debt

- public product preview содержит вручную написанные иллюстративные примеры задач. Они не выданы за пользовательские результаты, но визуально могут восприниматься как реальный dashboard; маркировку preview нужно сделать однозначнее или строить preview из обезличенной product anatomy.
- крупный `components/dashboard.tsx` совмещает selection logic и несколько surface sections; следующий polish лучше начать с композиционных boundaries, не с глобального refactor.
- auth/onboarding/diagnostic используют несколько слоёв legacy CSS и class naming; token contract общий, но maintenance cost растёт.
- loading/error coverage есть у student/onboarding/parent/diagnostic, но staff/auth/admin role surfaces покрыты неравномерно.
- lesson page не ставит видео/recording как главный объект до остальных элементов для всех статусов; live и post-live modes стоит развести продуктово.
- bottom navigation намеренно содержит только реальные student routes; AI нельзя добавлять до рабочего route.

### Design critique references

`taste-skill` и `open-design` не установлены как callable skills в текущей среде. Их официальные repositories доступны и использованы только как внешний критический слой: меньше generic card grids, осмысленная плотность, явная hierarchy, motion только для state change, design system как переносимый контракт. Правила ELIO и доступность имеют больший приоритет.

## 16. Open-source LMS research

| Источник | Полезный паттерн для ELIO | Что не переносить |
|---|---|---|
| [ClassroomIO](https://github.com/classroomio/classroomio) | cohorts/audiences, course completion, lesson-level AI context | B2B academy/multi-workspace модель |
| [LearnHouse](https://github.com/learnhouse/learnhouse) | composable content blocks, API-first content, AI as bounded learning tool | новый FastAPI/headless backend и enterprise multi-tenancy |
| [CourseLit](https://github.com/codelitdev/courselit) | clear catalog→product→checkout→learner progress boundary | Mongo/repository migration и creator-commerce scope |
| [Frappe LMS](https://github.com/frappe/lms) | course→chapter→lesson hierarchy, batches/live sessions, distraction-free learner flow | Frappe framework и избыточные institution workflows |
| [Equip](https://github.com/ArVaViT/equip) | small-team deployment discipline, documentation/roadmap culture, Supabase pragmatism | domain-specific Bible-school model и отдельный FastAPI backend |

Вывод: в ELIO уже есть аналоги cohorts (`groups`), course hierarchy (`programs/modules/topics/lessons`), commerce boundary и scoped roles. Ценность research — улучшить authoring/learner experience, а не заменить backend.

## 17. Legacy map

### Пользовательский surface

Активные metadata, brand, payment description, email copy и основные экраны используют `elio`. Подтверждённых активных публичных упоминаний старого бренда в ключевых routes не найдено.

### Сохраняемые identifiers

- local-only seed emails `@pyaterka.local`;
- repository/remote name `pyaterka-school`;
- исторические UUID и migration filenames;
- tests, проверяющие совместимые seed identifiers.

Их нельзя переименовывать косметически.

### Исторические документы и dead surface candidates

- `PRODUCT_ARCHITECTURE.md`, `IMPLEMENTATION_GAP_ANALYSIS.md`, `IMPLEMENTATION_ROADMAP.md`, `PYATERKA_DESIGN_SYSTEM.md` содержат legacy context;
- неиспользуемые testimonials/teacher components и `public-v9-*` CSS требуют route dependency map перед удалением;
- legacy документы следует помечать как archived/superseded, а не переписывать задним числом.

## 18. Проверка assumptions

| Предположение | Вывод |
|---|---|
| «Нужно создать новый ELIO frontend» | неверно: foundation уже есть; нужен итеративный product completion |
| «Backend менять нельзя вообще» | слишком жёстко: для новых vertical slices допустимы только additive migrations с RLS/tests |
| «AI mentor уже есть из-за `ai_conversations`» | неверно: есть только data boundary |
| «Parent/teacher/admin готовы, раз routes существуют» | неверно: уровни зрелости различаются |
| «Все новые функции сохраняются» | частично: completion/submission/goals сохраняются, started/resume events отсутствуют |
| «Все курсы/уроки полностью идут из Supabase» | частично: product data идёт из Supabase, но public diagnostic questions — versioned TypeScript set; lesson catalog зависит от schedule |
| «RLS проверен» | частично: static/source tests зелёные, опубликованный PostgreSQL RLS CI красный |
| «Design skills применены» | частично: repositories изучены как references, skills не установлены/callable |

## 19. Risk map

| Priority | Риск | Evidence | Решение |
|---|---|---|---|
| P0 | красный RLS CI предыдущего commit | run `32403049178`, rls job failure | fixture исправлен; получить green PostgreSQL run нового commit |
| P0 | generated DB types отсутствуют | нет `types/database.generated.ts` | применить migrations в Supabase env, сгенерировать и подключить types |
| P1 | post-login route ломал non-student UX | безусловный `/student` redirect | resolver и tests добавлены; подтвердить CI/smoke test |
| P1 | schema suggests AI, UI может создать ложное ожидание | action/context есть, route/provider нет | отдельный AI architecture milestone |
| P1 | уроки без schedule event были невидимы | lesson IDs выводились из event rows | прямой RLS catalog query и test добавлены; подтвердить CI |
| P1 | started/resume actions не персистятся | нет Server Action/RPC | additive event/progress migration/action |
| P1 | production readiness не доказана | checklist NO-GO, legal/payment/storage smoke open | owner go/no-go process |
| P2 | static fallback package copy может устареть | `fallbackPlans` | config-backed unavailable state или versioned public config |
| P2 | role dashboards uneven | parent foundation, admin placeholder | vertical slices by role |
| P2 | legacy CSS/components | search evidence | dependency map then scoped deletion |

## 20. Быстрые победы после подтверждения

1. Повторить CI с исправленным RLS fixture.
2. Выполнить role-aware login smoke test для всех пяти ролей.
3. Добавить `lesson_started`, resume position и `homework_started` через additive migration/RPC/actions.
4. Сгенерировать и подключить Supabase database types после применения migrations.
5. Выполнить authenticated mobile visual QA на local Supabase seed для student/parent/teacher/curator/admin.

## 21. Нельзя менять без отдельного решения

- старые migrations, role codes, seed UUID и user IDs;
- canonical table identifiers и relation model;
- bucket IDs, object path contracts и private/public status;
- env names, payment/provider/webhook identifiers;
- price formation, subscription lifecycle и webhook activation rules;
- parent privacy allow-list;
- RLS helpers/policies без PostgreSQL integration tests всех ролей;
- legal copy, refund/recurring policy и AI retention/consent policy;
- framework/backend architecture в сторону microservices, multi-tenant или нового CMS.

## 22. Проверки этого прохода

Локально:

- TypeScript strict (`tsc --noEmit`) — успешно;
- ESLint — успешно;
- Node test runner — 78/78 успешно;
- Next.js production build — успешно, 22 static pages, routes собраны;
- `git diff --check` до создания этого документа — чисто;
- working tree до аудита — чистый.

Команды через `npm run ...` в этой управляемой среде были прерваны инфраструктурным approval disconnect, поэтому локально запущены их точные binaries/scripts. GitHub `verify` job на опубликованном data-layer commit выполнил именно `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` и завершился успешно.

Интеграционно:

- migrations применились в GitHub PostgreSQL 16 job;
- RLS suite не прошёл из-за описанного fixture/assert conflict;
- authenticated browser/mobile QA в этом проходе не выполнен;
- end-to-end Supabase Auth, Resend и ЮKassa с production credentials не выполнялись.

## 23. Рекомендуемая последовательность

1. **Stabilize:** green RLS CI, generated types, role-aware login.
2. **Learning continuity:** course catalog, started/resume events, lesson state model.
3. **Product surfaces:** diagnostic roadmap, AI mentor vertical slice, parent period views.
4. **Staff operations:** review/grading/attendance, then admin console.
5. **Production proof:** authenticated visual QA, accessibility pass, Supabase/YooKassa/Resend smoke tests, legal and monitoring go/no-go.

До завершения шага 1 изменения не следует переносить в `main`.
