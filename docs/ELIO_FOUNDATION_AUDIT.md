# Аудит foundation elio

Дата: 21 августа 2026

## Подтверждённые факты

- Next.js 16.3.1 App Router, React 19.2.6, TypeScript 5.9 strict и Tailwind CSS 4.2.1. В `engines` и CI закреплён Node 22.x; локальный аудит выполнен на Node 24.19.0.
- Supabase SSR Auth использует server cookies и `auth.getUser`; proxy обновляет сессию, а серверные guards отдельно проверяют роль и область доступа.
- Роли: `student`, `parent`, `teacher`, `curator`, `admin`.
- Используются Server Components, Server Actions, Route Handlers, Zod, Sentry, Resend, ЮKassa, ESLint и Node test runner. React Hook Form был объявлен, но не использовался и удалён вместе с другими неиспользуемыми UI-зависимостями.
- Private storage использует RLS и signed URL на 60 секунд.
- Webhook ЮKassa повторно получает платёж у провайдера, сверяет статус, сумму и metadata и вызывает service-role RPC. Возврат браузера не активирует подписку.
- Полный vertical slice есть у ученика. Parent/admin остаются role-protected foundation; teacher/curator имеют scoped learning editor.

## Карта продукта

| Поверхность | Фактическое состояние |
|---|---|
| публичный сайт | реальные CTA, диагностики и тарифы из Supabase; foundation elio |
| auth | login/register/recovery/reset через Supabase SSR |
| onboarding | 8 сохраняемых шагов, атомарная замена multi-row черновиков, transactional completion RPC |
| student | сегодня, agenda, уроки, материалы, записи, ДЗ foundation, оплата |
| parent | role guard и foundation-экран; полноценный поток не завершён |
| teacher/curator | role guard и scoped learning editor |
| admin | role guard и foundation-экран; CRUD-консоль не реализована |

## Технические риски

1. Новые SQL-миграции и весь `supabase/tests/rls.sql` не выполнены локально: в среде нет PostgreSQL, Docker и Supabase CLI. До merge обязателен зелёный RLS CI на Node 22.
2. Production dependency audit после обновления Next.js сократился с 18 до 2 advisories, но всё ещё содержит один high (`fast-uri` через AJV/schema tooling) и один low (`@babel/core` через Sentry tooling). Автоматическое широкое обновление зависимостей не применялось; high остаётся release blocker до точечного решения.
3. Rate-limit mutation RPC теперь доступен только `service_role`, а сервер очищает устаревшие строки. Эту смену привилегий нужно проверить реальным выполнением миграции.
4. Полноценные flows parent/admin не реализованы; нельзя изображать их готовыми только потому, что routes существуют.
5. Юридические документы остаются рабочими черновиками и требуют утверждения до production.

## Карта rebrand

Изменено:

- metadata, wordmark, SVG mark, favicon и package display metadata;
- публичная композиция, copy и product preview без выдуманных числовых результатов;
- semantic tokens, контраст, focus и touch targets;
- auth, email invitation, payment description, student shell и offline copy;
- localStorage diagnostic namespace.

Сохранено намеренно:

- названия старых migrations и database identifiers;
- seed UUID и email `@pyaterka.local` как совместимые тестовые идентификаторы;
- provider/payment/webhook identifiers и env key names;
- исторические архитектурные документы как evidence предыдущих решений.

Оставшийся legacy:

- неиспользуемые public assets и часть legacy CSS нужны для отдельной безопасной инвентаризации перед удалением;
- исторические документы содержат прежнее название и должны сохранять явную маркировку legacy;
- database/seed identifiers не являются пользовательской бренд-поверхностью и не переименовываются без миграционного решения.

## UX/design-долг

- onboarding и diagnostic используют legacy class structure, хотя наследуют токены elio;
- staff/role homes требуют отдельной продуктовой итерации, а не косметической покраски;
- старые public CSS-файлы подключены для `/start`, auth и diagnostics;
- screenshot baseline пока хранится как ручной QA-артефакт, а не автоматический regression test;
- нет утверждённых реальных профилей преподавателей, отзывов и результатов — публично они не показываются.

## Быстрые победы

- product-workspace hero вместо фото и цифры 5;
- честный preview кабинета и честные empty/offline states;
- mobile-first public layout, 44 px touch targets и отсутствие горизонтального scroll на проверенных размерах;
- новый 404, skip link, focus states и reduced-motion behavior;
- единый elio surface для public/auth/student.

## Нельзя менять без отдельного решения

- старые migrations, seed UUID, role codes и parent/student relation model;
- payment/webhook identifiers, env names, bucket names и storage paths;
- pricing logic или fallback prices;
- RLS policies без интеграционных тестов всех пяти ролей;
- архитектуру в сторону microservices, multi-tenant или глобальный refactor.

## Ограничения проверки

- Локальная среда: Node 24.19.0 вместо требуемого Node 22.x.
- Authenticated student/lesson UI не проверен визуально: без локального Supabase `/student` показывает честный offline state, а защищённый lesson route переводит на login.
- Интеграционный SQL suite не запускался. Source/unit tests проверяют наличие и форму security controls, но не заменяют PostgreSQL/RLS execution.
- Подробная матрица ручной проверки: [ELIO_VISUAL_QA.md](ELIO_VISUAL_QA.md).

## Выполненные проверки

- clean install: `npm ci` — успешно, с ожидаемым предупреждением о локальном Node 24 против engine 22;
- TypeScript strict и ESLint — успешно после clean install;
- Node test runner — 72/72 теста успешно;
- Next.js production build — успешно, 22 static pages;
- visual QA — 30 route/viewport сочетаний, 0 horizontal overflow, 0 console/page errors, 0 целей меньше 44×44 px;
- `git diff --check` — чисто;
- `npm audit --omit=dev` — exit 1: 1 high и 1 low, поэтому production остаётся NO-GO;
- `npm run check` как единая wrapper-команда оборван средой при вложенном npm-вызове; все четыре составляющие выполнены отдельно успешно.
