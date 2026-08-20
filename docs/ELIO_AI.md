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

AI не должен создавать ощущение готовой функции только из-за наличия `ai_conversations`. До публичного запуска необходимы provider boundary, streaming UI, rate/cost limits, moderation, retention policy и evals.

Техническая схема: [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).
