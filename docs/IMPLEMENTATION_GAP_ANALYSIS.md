# Gap analysis текущего проекта «Пятёрка»

Версия 1.0 · 1 августа 2026

## Результат аудита

Проверены реальные компоненты, Server Actions, Supabase queries, обе миграции, функции, policies, seed и тесты. Названия из исходного архитектурного документа не считаются реализацией без таблицы и рабочего route/use case.

| Область | Статус | Фактическое состояние | Следующее действие |
|---|---|---|---|
| Next.js foundation | реализовано | App Router, strict TS, Tailwind 4, Vinext/Sites build | сохранить |
| Supabase SSR Auth | реализовано | cookie client, login/register, `auth.getUser` | добавить reset/verify UX позже |
| Роли | частично | 5 кодов; manager/tech admin нет | additive migration позже |
| Route guards | реализовано | role check на server pages | добавить scoped policy services |
| Онбординг | реализовано | 8 шагов, resume, Zod, Supabase | визуально улучшить после public DS |
| Завершение онбординга | реализовано | security-definer RPC, rollback, idempotency | интеграционные DB-тесты |
| Parent invitation | реализовано | token hash, expiry, invalidation, accept RPC и Resend adapter | настроить verified sender в production |
| Student home | реализован первый срез | реальные profile/subjects/subscription, ближайшее занятие, задачи и empty states | добавить результаты после assessments |
| Parent/teacher/curator/admin | только UI | role-protected `RoleHome` | поэтапные vertical slices |
| Публичный сайт | реализовано | светлый самостоятельный бренд, Supabase-тарифы, legal routes, формы без вымышленных данных | подключить утверждённый production-контент |
| Дизайн-система | реализован фундамент | единые tokens публичной части, auth, onboarding и спокойной LMS | выделять primitives по мере повторения |
| shadcn/ui | отсутствует как registry | зависимости Radix нет, компоненты ручные | не ставить автоматически |
| Курсы/модули/темы | только таблицы | CRUD и UI отсутствуют | расширить перед lessons stage |
| Уроки/расписание | реализован MVP authoring flow | agenda, lesson detail и scoped staff-редактор создания урока | расширять редактирование по фактическим сценариям |
| Материалы/записи | реализован базовый flow | private buckets, signed URL endpoints и публикация HTTPS-материала из редактора | добавить upload UI при необходимости |
| ДЗ | реализован минимальный flow | ДЗ с дедлайном и заданиями банка отображается в уроке; submissions/review ещё нет | добавить сдачу и проверку |
| Пробники | только базовые таблицы | нет version/attempt/timer/scale flow | отдельный этап |
| Аналитика | только базовые таблицы | нет событий и реальных графиков | после assessments |
| Коммуникации/отчёты | отсутствуют/частично в schema plan | нет UI/use cases | позднее |
| Коммерция | реализован первый платёжный flow | pending subscription + идемпотентный YooKassa checkout + проверяемый webhook activation | refunds/reconciliation later |
| Public legal | отсутствует | нет policy/offer/consent pages | public site stage |
| Runtime env | ограничение | production Supabase keys не настроены в Sites | требуется подключение владельца |

## Что сломано или рискованно

1. Foundation RLS был слишком широким для teacher/curator. Миграция `202608010002_student_learning_stage.sql` заменяет эти политики назначенными группами и закреплёнными учениками; до production остаётся прогнать интеграционные тесты на реальном PostgreSQL.
2. `profiles_scope` разрешает parent читать profile ребёнка корректно, но staff scope не описан полноценно.
3. `plans_public` называется public, но `auth.uid()` не требуется; это допустимо для каталога, однако клиент не должен менять строки — grants нужно тестировать интеграционно.
4. Действия промежуточных шагов онбординга выполняют delete + insert отдельными запросами; финальная операция атомарна, но сохранение черновика может оставить пустой список при сетевой/DB ошибке между запросами. Нужен draft RPC в будущем.
5. Публичный demo dashboard и `lib/demo.ts` удалены; защищённый кабинет использует только Supabase.
6. `.env.example` добавлен и отслеживается Git.
7. Тесты всё ещё в основном статически анализируют код/SQL; pgTAP/локальные RLS integration tests отсутствуют в среде сборки.

## Дублирование

- `db/schema.ts` относится к Sites D1 example и не отражает Supabase domain; не использовать как вторую ORM-модель продукта.
- `examples/d1` — инфраструктурный пример, не production feature.
- `Dashboard` теперь используется только защищённым student route и не содержит production demo fallback.

## Переиспользуемые компоненты

`Brand`, auth actions, `AuthScreen`, onboarding forms/frame/shell, `Dashboard`, `RoleHome`, Supabase/auth helpers, email/invitation adapters, onboarding config/types.

## Реальные и статические данные

- Реальные Supabase: onboarding, student profile, exam types, subjects, scoring rules, plans/features/limits, goals, schedule preferences, parent draft, subscription, student cabinet summary.
- Статика: тексты публичного hero и role-home descriptions; фактические коммерческие/учебные показатели не подставляются.
- Честные empty states: расписание, уроки, записи, материалы, tasks и аналитика после входа.

## Требует миграции

- manager/technical_admin roles;
- schedule recurrence/exceptions;
- lesson-material metadata и content publication;
- assignment versions/attempts;
- mock versions/attempts/scales;
- notification deliveries/report recipients.

## Внешние сервисы

Production использует Supabase, Resend, Sentry и YooKassa. FullCalendar и ECharts по-прежнему не нужны до появления соответствующих сценариев.

## Отложить

Маткапитал workflow, CRM, Telegram/SMS, AI, прокторинг, native apps, external calendar sync, video processing, refunds и payment reconciliation reports.

## Не нужно проекту

Универсальный plugin marketplace, XBlock runtime, Moodle-compatible capability editor, Cal.com booking platform, собственный video service, десять dashboard-графиков.
