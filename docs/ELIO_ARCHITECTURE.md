# Архитектура ELIO

## Форма системы

ELIO — модульный монолит на Next.js App Router и Supabase. Существующий backend остаётся foundation: UI и продуктовые сценарии развиваются поверх канонических таблиц, RLS и RPC, без второго API-слоя и дублирования домена.

## Границы выполнения

| Задача | Граница |
|---|---|
| Чтение продукта | Server Component → Supabase SSR client → RLS |
| Пользовательская мутация | UI form → Server Action → Zod → Supabase/RPC → revalidate |
| Многострочный инвариант | PostgreSQL transaction/RPC |
| Private file | Route Handler → session/RLS → signed URL 60 секунд |
| Payment activation | verified ЮKassa webhook → service-role RPC |
| Observability | server/client instrumentation → Sentry |

Service role разрешён только в `server-only` helpers для webhook и инфраструктурных auth rate limits. Он не является обычным data client и никогда не передаётся browser code или AI tools.

## Домены

- identity: profiles, roles, parent/student relations;
- onboarding: exam, subjects, goals, schedule, plan, invitation;
- learning: programs, groups, lessons, schedule, materials, homework, progress;
- assessment: diagnostics, question bank, submissions, forecasts;
- motivation: activity, streak, weekly goals;
- commerce: plans, subscriptions, payments;
- operations: notifications, audit logs, monitoring.

## Развитие

Новые функции добавляются вертикальным срезом: schema/migration → RLS/indexes → typed server boundary → UI states → tests → production smoke check. Старые migrations, identifiers и webhook contracts не редактируются.

Полная карта состояния и рисков: [ELIO_AUDIT.md](ELIO_AUDIT.md).
