# Supabase data layer

## Канонические модели

Новый слой не переименовывает и не дублирует рабочие идентификаторы. `programs`, `assignments`, `assignment_submissions` и `parent_student_links` остаются источниками истины. Требуемые продуктовые названия доступны через совместимые views:

| Product name | Canonical source |
| --- | --- |
| `courses` | `programs` + `subjects` |
| `homework` | `assignments` |
| `student_homework` | `assignment_submissions` |
| `parent_student_relation` | `parent_student_links` |
| `parent_progress_view` | подтверждённая связь + агрегаты progress/attendance/homework |

Миграция `202608210003_learning_data_layer.sql` добавляет только отсутствующее состояние: `student_progress`, `student_lesson_progress`, `diagnostics`, `ai_conversations`, `student_activity`, `student_weekly_goals`, поля course content и student answer.

## Мутации

- Начало урока: `startLesson` → Zod UUID → `start_student_lesson` → idempotent progress + `lesson_started` activity.
- Завершение урока: `completeLesson` → Zod UUID → `complete_student_lesson` → lesson/course progress + activity.
- Начало ДЗ: `startHomework` → Zod UUID → `start_student_homework` → idempotent in-progress submission + `homework_started` activity.
- Отправка ДЗ: `submitHomework` → Zod → `submit_student_homework` → submission + activity.
- Диагностика: ответы переносятся до регистрации без browser storage, сервер заново вычисляет результат по каноническому question set, auth trigger сохраняет snapshot.
- AI history: `saveAiConversation` валидирует bounded messages и сохраняет вместе с server-only context.
- Weekly goal: `saveWeeklyGoal` вычисляет начало недели в timezone профиля и upsert-ит цель; activity trigger отмечает `reached_at` только по реально набранным points.

RPC повторно проверяют роль и scoped access. Прямая authenticated-вставка в `assignment_submissions` отозвана, поэтому frontend guard нельзя использовать как обход server boundary.

## Privacy и RLS

- Student читает собственные progress, diagnostics, activity и AI history.
- Teacher читает progress только по курсу назначенной группы и lesson progress только для управляемых уроков.
- Curator читает данные только закреплённых учеников.
- Parent не имеет прямого доступа к answers, diagnostics, granular activity или AI conversations. `parent_progress_view` возвращает только allow-list агрегатов.
- Admin имеет CRUD policy на новые таблицы.
- Private storage и signed URL handlers не менялись.

## Часовые пояса

Activity date вычисляется в timezone профиля внутри RPC. UI считает streak по той же timezone, а не по timezone браузера или UTC сервера.

## Types

После применения migrations к локальному Supabase выполните:

```bash
npm run types:supabase
```

Скрипт вызывает Supabase CLI и атомарно обновляет `types/database.generated.ts`: при ошибке существующий файл не обнуляется. Для запуска нужны Supabase CLI и локальный stack. В текущем рабочем контейнере их нет; PostgreSQL RLS suite остаётся CI-проверкой, а generated types нужно обновить в dev/CI environment с Supabase CLI после применения migration.

## Safe demo seed

`supabase/seed.sql` остаётся local-only. Он содержит вымышленные `.local` аккаунты, один явно помеченный demo course, два ordered lessons, homework, progress и activity. Записей recordings и реальных пользовательских данных нет.

## Проверка сценариев

RLS suite проверяет idempotent own/foreign lesson и homework starts, lesson completion, homework answer persistence, запрет parent-доступа к answers/diagnostics/AI и safe parent projection. Source tests проверяют наличие migrations, indexes, RLS, Server Actions и отсутствие `localStorage` persistence.

Ограничение: публичный анонимный тест не может создать строку с `user_id` до появления пользователя. Его ответы живут только в состоянии открытой формы и сохраняются в Supabase транзакцией auth trigger при создании аккаунта; долговременного browser storage нет.
