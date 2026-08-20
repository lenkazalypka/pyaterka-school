# Продуктовый контракт AI в ELIO

AI mentor помогает ученику понять тему и выбрать следующий шаг. Он не заменяет преподавателя, не выставляет итоговые оценки и не изменяет progress без подтверждённого пользовательского действия.

## Разрешённый контекст

- выбранные предметы и цели;
- course/lesson progress;
- weak topics и диагностические рекомендации;
- статусы и результаты проверенных заданий.

## Запрещённый доступ

- service-role credentials;
- данные других учеников;
- parent/private messages без отдельного consent;
- произвольные database mutations;
- скрытые ответы question bank до выполнения задания.

Beta foundation включает server-only provider boundary, accessible streaming UI, Postgres rate limit, 90-дневное прекращение доступа и удаление истории учеником. Feature flag выключен по умолчанию; нет fake fallback и модель не получает write tools.

До публичного запуска остаются обязательными: юридическое согласование обработки данных, стратегия output moderation для streaming, педагогические и privacy evals, cost telemetry/budget alerts и зелёный production RLS CI.

Техническая схема: [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).
