# Пятёрка

Запускаемый MVP онлайн-школы ЕГЭ/ОГЭ. Реализованы фундамент, полный онбординг, публичный сайт и первый учебный вертикальный срез: Supabase SSR auth, scoped RLS, приватные buckets, восемь сохраняемых шагов онбординга, безопасное приглашение родителя, pending-подписка, адаптивный бренд-сайт, кабинет «Сегодня», расписание, уроки, записи и материалы.

Полное проектирование до кода: [docs/PRODUCT_ARCHITECTURE.md](docs/PRODUCT_ARCHITECTURE.md).

Актуальные решения после аудита:

- [Reverse engineering LMS](docs/LMS_REVERSE_ENGINEERING.md)
- [Целевая LMS-архитектура](docs/TARGET_LMS_ARCHITECTURE.md)
- [Gap analysis](docs/IMPLEMENTATION_GAP_ANALYSIS.md)
- [Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Визуальное направление](docs/DESIGN_DIRECTION.md)
- [Visual reverse engineering Сотки](docs/SOTKA_VISUAL_REVERSE_ENGINEERING.md)
- [Дизайн-система «Пятёрки»](docs/PYATERKA_DESIGN_SYSTEM.md)

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

## Тестовые аккаунты

Seed предназначен только для local. Пароль всех аккаунтов: `Demo123!`.

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

Команда выполняет TypeScript strict check, ESLint, тесты маршрутов/RLS/RPC и production build.

Если Supabase CLI недоступен, source-тесты и build всё равно выполняются, но интеграционную проверку RLS нужно отдельно запустить в локальном Supabase перед production.

## Учебный кабинет

- `/student` — ближайшее реальное занятие, задачи и выбранные предметы;
- `/student/schedule` — лёгкий agenda с временем в часовом поясе ученика;
- `/student/lessons` — доступные уроки купленных предметов;
- `/student/lessons/:id` — цели, опубликованная запись и материалы;
- `/api/materials/:id` и `/api/recordings/:id` — проверка сессии/RLS и временная signed URL либо безопасный HTTPS redirect.

Миграция `202608010002_student_learning_stage.sql` убирает role-only доступ teacher/curator, проверяет назначенную группу и активную подписку на предмет, скрывает host secret видеовстречи и добавляет RLS для приватных файлов.

## Онбординг

Маршруты: `/onboarding/profile`, `/exam`, `/subjects`, `/goals`, `/schedule`, `/parent`, `/plan`, `/review`. `/onboarding` восстанавливает последний сохранённый шаг. Незавершённый ученик не открывает `/student`, а завершённый не может повторно открыть обычный онбординг.

Финальная кнопка вызывает `complete_student_onboarding`: PostgreSQL-функция проверяет роль, полноту, активность экзамена/предметов/тарифа и лимит предметов, затем в одной транзакции создаёт pending manual subscription, её предметы, черновой учебный план, приглашение и audit log. Повторный вызов безопасен благодаря `onboarding_completion_key`.

При `EMAIL_PROVIDER=console` ссылка приглашения выводится только в development-лог. В БД хранится SHA-256 hash с серверным pepper; срок действия — 72 часа. Для production подключите реальный адаптер в `lib/email.ts`.

## Vercel + Supabase

1. Создайте production Supabase, примените только `supabase/migrations`, не local seed.
2. Добавьте переменные из `.env.example` в Vercel.
3. В Supabase Auth URL Configuration добавьте production URL.
4. До реальных учеников прогоните интеграционные RLS-тесты всех пяти ролей.
5. Service-role никогда не отправляется в браузер.

## Граница этапа

Редакторы уроков и ДЗ, банк заданий, таймер пробника, переписка, отчёты, реальные платежи и боевые email-провайдеры не имитируются статикой: они идут следующими этапами из архитектурного плана. Кабинет показывает только доступные через Supabase данные; для отсутствующих учебных сущностей используются честные пустые состояния.

Публичная страница загружает активные тарифы из Supabase, когда production-переменные настроены. Без базы показывается только состав пакетов без выдуманной цены. Юридические страницы помечены как рабочие черновики и требуют утверждения до приёма реальных заявок.
