# elio

Mobile-first edtech-платформа подготовки к ЕГЭ/ОГЭ. Реализованы Supabase SSR auth и scoped RLS, полный онбординг, публичный сайт, кабинет ученика, staff-редактор уроков/материалов/ДЗ, банк заданий, Resend, Sentry и оплата pending-подписки через ЮKassa.

Актуальный продуктовый и визуальный контракт:

- [Манифест elio](docs/ELIO_MANIFESTO.md)
- [Продуктовые принципы](docs/ELIO_PRODUCT_PRINCIPLES.md)
- [Дизайн-система](docs/ELIO_DESIGN_SYSTEM.md)
- [Mobile-паттерны](docs/ELIO_MOBILE_PATTERNS.md)
- [Аудит foundation и карта legacy](docs/ELIO_FOUNDATION_AUDIT.md)
- [Журнал решений](docs/ELIO_DECISIONS.md)
- [Матрица visual QA](docs/ELIO_VISUAL_QA.md)
- [Независимый аудит](docs/ELIO_AUDIT.md)
- [Архитектура ELIO](docs/ELIO_ARCHITECTURE.md)
- [База данных ELIO](docs/ELIO_DATABASE.md)
- [Продуктовый контракт AI](docs/ELIO_AI.md)
- [AI architecture](docs/AI_ARCHITECTURE.md)
- [Roadmap ELIO](docs/ELIO_ROADMAP.md)

Полное проектирование до кода: [docs/PRODUCT_ARCHITECTURE.md](docs/PRODUCT_ARCHITECTURE.md).

Актуальные решения после аудита:

- [Reverse engineering LMS](docs/LMS_REVERSE_ENGINEERING.md)
- [Целевая LMS-архитектура](docs/TARGET_LMS_ARCHITECTURE.md)
- [Gap analysis](docs/IMPLEMENTATION_GAP_ANALYSIS.md)
- [Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Визуальное направление](docs/DESIGN_DIRECTION.md)
- [Visual reverse engineering Сотки](docs/SOTKA_VISUAL_REVERSE_ENGINEERING.md)
- [Legacy-дизайн-система «Пятёрки»](docs/PYATERKA_DESIGN_SYSTEM.md)

## Запуск

Требования: Node 22+, Docker, Supabase CLI.

```bash
npm install
cp .env.example .env.local
supabase start
supabase db reset
npm run dev
```

После `supabase start` перенесите локальные URL и anon key в `.env.local`.

### Переменные окружения

`.env.example` содержит полный шаблон без секретов. Для production обязательны Supabase public keys и server-only service role, canonical HTTPS `NEXT_PUBLIC_APP_URL`, уникальные `INVITATION_TOKEN_PEPPER` и `RATE_LIMIT_PEPPER`, Resend, Sentry и реквизиты ЮKassa. `EMAIL_PROVIDER=console` разрешён только локально. Для писем Supabase Auth настройте Resend как custom SMTP. Ни `SUPABASE_SERVICE_ROLE_KEY`, ни ключи провайдеров не должны иметь префикс `NEXT_PUBLIC_`.

Sites/Cloudflare runtime удалён из основной ветки, потому что активного заказчика под него нет; единственный production-путь проекта — Next.js на Vercel с Supabase.

## Тестовые аккаунты

Seed предназначен только для local. Пароль всех аккаунтов: `Demo123!`. Адреса `@pyaterka.local` сохранены как совместимые тестовые идентификаторы и не являются актуальным брендом.

| Роль | Email |
|---|---|
| Ученик | `student@pyaterka.local` |
| Ученик с незавершённым онбордингом | `student-onboarding@pyaterka.local` |
| Родитель | `parent@pyaterka.local` |
| Преподаватель | `teacher@pyaterka.local` |
| Куратор | `curator@pyaterka.local` |
| Администратор | `admin@pyaterka.local` |

## Проверка

```bash
npm run check
```

Команда выполняет TypeScript strict check, ESLint, source/unit tests маршрутов, RLS/RPC contracts и production build.

Если Supabase CLI недоступен, source-тесты и build всё равно выполняются, но интеграционную проверку RLS нужно отдельно запустить в локальном Supabase перед production.

## Учебный кабинет

- `/student` — ближайшее реальное занятие, задачи и выбранные предметы;
- `/student/schedule` — лёгкий agenda с временем в часовом поясе ученика;
- `/student/lessons` — доступные уроки купленных предметов;
- `/student/lessons/:id` — цели, опубликованная запись и материалы;
- `/staff/learning` — scoped-редактор уроков, материалов, ДЗ и банка заданий для преподавателя/куратора;
- `/api/materials/:id` и `/api/recordings/:id` — проверка сессии/RLS и временная signed URL либо безопасный HTTPS redirect.

Persistent progress, homework submissions, diagnostics, activity/streak, AI context и privacy-safe parent projection описаны в [Supabase data layer](docs/SUPABASE_DATA_LAYER.md).

Миграция `202608010002_student_learning_stage.sql` убирает role-only доступ teacher/curator, проверяет назначенную группу и активную подписку на предмет, скрывает host secret видеовстречи и добавляет RLS для приватных файлов.

## Онбординг

Маршруты: `/onboarding/profile`, `/exam`, `/subjects`, `/goals`, `/schedule`, `/parent`, `/plan`, `/review`. `/onboarding` восстанавливает последний сохранённый шаг. Незавершённый ученик не открывает `/student`, а завершённый не может повторно открыть обычный онбординг.

Финальная кнопка вызывает `complete_student_onboarding`: PostgreSQL-функция проверяет роль, полноту, активность экзамена/предметов/тарифа и лимит предметов, затем в одной транзакции создаёт pending manual subscription, её предметы, черновой учебный план, приглашение и audit log. Повторный вызов безопасен благодаря `onboarding_completion_key`.

При `EMAIL_PROVIDER=console` ссылка приглашения выводится только в development-лог. В production встроенный Resend-адаптер отправляет письмо через HTTPS API; отсутствие ключа или адреса отправителя вызывает явную configuration error до завершения flow. В БД хранится SHA-256 hash с серверным pepper; срок действия — 72 часа.

## Vercel + Supabase

1. Создайте production Supabase, примените только `supabase/migrations`, не local seed.
2. Добавьте переменные из `.env.example` в Vercel.
3. В Supabase Auth URL Configuration добавьте production URL.
4. До реальных учеников прогоните интеграционные RLS-тесты всех пяти ролей.
5. Service-role никогда не отправляется в браузер.

Перед первым деплоем пройдите [production checklist](docs/PRODUCTION_CHECKLIST.md). Приложение дополняет лимиты Supabase постоянным 5-attempt/TTL rate limit; mutation RPC доступны только server-side service role, ошибки и ключевые события отправляются в Sentry, in-memory заглушки не используются.

## Оплата

Кнопка в кабинете создаёт идемпотентный платёж ЮKassa только для собственной `pending`-подписки; цена и валюта берутся серверной PostgreSQL-функцией из тарифа. Настройте HTTPS webhook `/api/payments/yookassa/webhook` на события `payment.succeeded` и `payment.canceled`. Обработчик повторно получает платёж из API ЮKassa, сверяет статус, сумму и metadata, после чего service-role RPC атомарно активирует подписку. Возврат пользователя на сайт не активирует доступ сам по себе.

## Граница этапа

Таймер пробника, переписка и отчёты остаются следующими этапами. Кабинет показывает только доступные через Supabase данные; для отсутствующих учебных сущностей используются честные пустые состояния.

Публичная страница загружает активные тарифы из Supabase, когда production-переменные настроены. Без базы показывается только состав пакетов без выдуманной цены. Юридические страницы помечены как рабочие черновики и требуют утверждения до приёма реальных заявок.
