# База данных ELIO

## Источники истины

ELIO сохраняет исходный academic domain:

- `programs` — курсы;
- `lessons` — уроки;
- `assignments` — домашние задания;
- `assignment_submissions` — ответы и проверка;
- `parent_student_links` — связь родителя и ученика.

Product-facing names `courses`, `homework`, `student_homework` и `parent_student_relation` реализованы views. Переименование канонических таблиц не требуется.

## Persistent student state

- `student_progress` — агрегат курса и следующий этап;
- `student_lesson_progress` — started/completed и позиция;
- `diagnostics` — snapshot вопросов, ответов, результата и рекомендаций;
- `student_activity` — реальные учебные события и points;
- `student_weekly_goals` — цель недели;
- `ai_conversations` — приватная история с context snapshot.

## Privacy

- student читает собственные данные;
- parent читает только allow-listed агрегаты подтверждённого ребёнка;
- teacher читает назначенные группы и управляет академическим контентом только там;
- curator видит закреплённых учеников, но не получает academic authoring;
- admin имеет расширенный доступ, который всё равно проходит серверные boundaries и audit review.

Answers, diagnostics, granular activity и AI conversations не входят в parent projection.

## Migration discipline

Migrations применяются только по имени и никогда не переписываются после публикации. Каждая новая таблица требует FK/check constraints, индексы по access/query path, RLS, grants/revokes и PostgreSQL integration test.

Generated types обновляются после применения migrations:

```bash
npm run types:supabase
```

В production `supabase/seed.sql` не применяется. Он содержит только local-only вымышленные аккаунты и demo learning slice.
