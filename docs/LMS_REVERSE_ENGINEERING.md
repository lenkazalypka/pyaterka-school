# Reverse engineering LMS для «Пятёрки»

Версия 1.0 · 1 августа 2026

## Метод

Исследование основано на открытых репозиториях и официальной документации [Open edX](https://github.com/openedx/openedx-platform), [Canvas LMS](https://github.com/instructure/canvas-lms), [Moodle](https://github.com/moodle/moodle), [SaaS App](https://github.com/adrianhajdin/saas-app), [FullCalendar](https://github.com/fullcalendar/fullcalendar), [Cal.diy](https://github.com/calcom/cal.diy), [Tremor](https://github.com/tremorlabs/tremor) и [Apache ECharts](https://github.com/apache/echarts). Код, визуальный язык и тексты проектов не копируются.

## Open edX

### Архитектурные идеи

Open edX — крупный модульный монолит на Django с отдельными LMS/CMS-контурами и React MFE. Полезная идея — отделять авторинг от прохождения, но не переносить физическое разделение приложений в MVP. Учебный контент имеет строгую иерархию `course → section → subsection → unit → component`; публикация, доступность и оценивание существуют отдельно от самого контента.

### Сильные стороны

- масштабируемая и проверенная модель содержания;
- отдельный контур Studio для преподавателя;
- публикация и release dates;
- версия и состояние учебного контента;
- прозрачный прогресс по единицам обучения и сценарий Resume Course;
- разные способы проверки, включая автоматическую и ручную.

### Слабые стороны

- сложное развёртывание и эксплуатация;
- контент распределён между несколькими техническими моделями;
- терминология и глубина иерархии рассчитаны на университеты и MOOC;
- MFE/IDA-архитектура избыточна для небольшой команды.

### Удачные учебные сценарии

- продолжить с последнего завершённого элемента;
- отдельно управлять публикацией и видимостью;
- считать завершение из наблюдаемых действий, а не только из клика;
- хранить политику оценивания независимо от вопроса.

### Применимые сущности

`program`, `course`, `module`, `topic`, `lesson`, `lesson_component`, `content_release`, `assessment_policy`, `progress_event`.

### Избыточные решения

XBlock runtime, OLX, LTI-провайдер, отдельные микрофронтенды и универсальная модель курса. Для «Пятёрки» достаточно типизированных уроков и материалов в PostgreSQL.

### Идеи для «Пятёрки»

Сохранить простую цепочку `программа → модуль → тема → урок`, добавить published/version fields, “Продолжить подготовку”, отдельные статусы материала и детерминированное правило завершения.

## Canvas LMS

### Архитектурные идеи

Canvas связывает курсы, секции, модули, задания, календарные события, submissions и gradebook. Разрешения контекстны: пользователь получает возможности в рамках курса/секции, а observer связан с конкретным учеником.

### Сильные стороны

- практичная модель assignment/submission/attempt/comment;
- модули поддерживают линейный путь и требования завершения;
- единый календарь объединяет события и дедлайны;
- due date overrides для групп и учеников;
- teacher workflow “нуждается в проверке”;
- observer видит только связанных учеников.

### Слабые стороны

- большое число настроек курса и разрешений;
- интерфейс ориентирован на преподавателя и университетский курс;
- gradebook и course navigation могут перегружать школьника;
- универсальные submission types шире потребностей MVP.

### Удачные UX-решения

Dashboard/Todo как точка входа, календарь с заданиями, линейные модули, статус работы рядом с дедлайном, очередь проверки преподавателя.

### Подход к курсам, заданиям, календарю и оценкам

- курс — контейнер учебного опыта;
- module — упорядоченная подборка материалов и заданий;
- assignment определяет срок, максимальный балл и допустимые способы ответа;
- submission хранит попытку, состояние, вложения и комментарии;
- calendar event и assignment deadline видны в одном временном представлении;
- grade редактируется только пользователем с разрешением в соответствующем контексте.

### Идеи для «Пятёрки»

Взять отдельные `assignment_attempts`, явный `needs_review`, overrides для индивидуального дедлайна, общий student agenda и подтверждённую parent/student связь. Не переносить универсальную навигацию курса.

## Moodle

### Надёжные и проверенные решения

Moodle строится вокруг курса, enrolment, групп, activity modules, gradebook и capability-based permissions. Роль и зачисление разделены. Parent/mentor назначается в контексте конкретного пользователя, один родитель может быть связан с несколькими детьми.

### Сильные стороны

- зрелая модель capabilities и контекстов;
- расширяемые activity types;
- надёжные попытки, оценки, дедлайны и журналы;
- детальные audit/event данные;
- гибкие группы и enrolments.

### Слабые стороны

- огромное число настроек и плагинов;
- сложная навигация и высокая когнитивная нагрузка;
- визуальная и терминологическая модель не ориентирована на подростка;
- кастомные роли легко настроить небезопасно.

### Удачная предметная модель

Разделять enrolment, role assignment, activity definition, attempt и grade item. Parent link должен давать возможности только относительно связанного ученика.

### Что нельзя повторять

Plugin runtime для каждой активности, произвольные capability overrides на каждом уровне, блоковую компоновку страниц и универсальный gradebook.

### Идеи для «Пятёрки»

Использовать явные связи `group_students`, `group_teachers`, `curator_students`, `parent_student_links`; проверять область доступа в RLS, а не только роль. Activity types оставить ограниченным набором: урок, материал, ДЗ, тренажёр, пробник.

## SaaS App by Adrian Hajdin

Репозиторий не используется как LMS-модель. Применимы только инженерные практики:

- App Router и маршруты по пользовательским сценариям;
- серверное получение данных и небольшие клиентские интерактивные острова;
- повторно используемые UI-компоненты;
- Zod на границе ввода;
- отделение auth/subscription от презентационных компонентов;
- адаптивные формы и единообразные loading/error states.

Не применимы: AI voice tutor как основа обучения, Clerk вместо существующего Supabase Auth и tutorial-ориентированная предметная модель.

## Итоговое сравнение

| Область | Open edX | Canvas | Moodle | Решение для «Пятёрки» |
|---|---|---|---|---|
| Роли | site/course staff, learner | account/course roles, observer | context roles | 7 фиксированных бизнес-ролей + scoped links |
| Разрешения | service/course checks | course/section permissions | capabilities по контексту | RLS + server policy functions |
| Направления | произвольные курсы | произвольные курсы | категории/курсы | ЕГЭ/ОГЭ как обязательное измерение |
| Курсы | course run | course | course | программа подготовки + курс учебного года |
| Модули | section/subsection/unit | modules/items | sections/activities | module/topic/lesson |
| Уроки | unit/components | module items/pages | activities/resources | типизированный урок + событие |
| Материалы | components/assets | files/pages | resources | единая metadata-таблица + private Storage |
| Задания | graded components | assignments | assignment activity | assignment + questions + attempts |
| Тесты | problem/XBlock | quizzes | quiz activity | question bank + assessment version |
| Пробники | exam subsections | quiz/assignment | quiz | отдельный mock exam со шкалой |
| Попытки | state per problem | submissions/attempt | attempts | immutable attempts + answers |
| Расписание | release/due dates | calendar/events | calendar | schedule event + recurrence + exception |
| Посещаемость | расширение | интеграции/roll call | plugins | собственная простая attendance |
| Оценки | grading policy | gradebook | gradebook | баллы по объекту + агрегаты по предмету |
| Прогресс | completion/progress | module requirements | completion tracking | наблюдаемые события + mastery snapshots |
| Уведомления | platform notifications | notification preferences | messaging | outbox notifications + email adapter |
| Аналитика | сильна, но сложна | course analytics | reports/logs | объяснимая предметная аналитика |
| Кабинеты | LMS/Studio | role dashboards | единый настраиваемый UI | отдельные role homes |
| Мобильный UX | MFE responsive | responsive/apps | responsive/app | mobile-first web, bottom nav для ученика |

## Calendar and Analytics Technology Review

### Вывод

На ближайшем этапе новые зависимости не устанавливаются. Ученику достаточно agenda + простой недельной ленты. FullCalendar Standard имеет смысл только в staff-модуле, когда появятся переносы и изменение длительности. Cal.diy используется как архитектурный референс, не как зависимость. KPI и таблицы остаются собственными. ECharts подключается позднее точечным модульным импортом только для реальных временных рядов. Tremor не нужен: текущие Tailwind-компоненты дают больший контроль над брендом.

| Задача | Собственная реализация | FullCalendar | Cal.com ideas | Tremor | ECharts | Выбранное решение |
|---|---|---|---|---|---|---|
| Student agenda | отлично | избыточен | timezone ideas | не относится | не относится | собственный список |
| Недельный план ученика | достаточно | полезен позже | recurrence | не относится | не относится | CSS grid/list |
| Staff drag-and-drop | дорого | сильная сторона | conflict rules | нет | нет | FullCalendar Standard позднее |
| Повторы/исключения | модель нужна | отображает | сильный референс | нет | нет | собственные таблицы recurrence/exception |
| KPI-карточки | просто | нет | нет | ускоряет | избыточно | свои shadcn-style primitives |
| Простые прогресс-бары | просто | нет | нет | возможно | избыточно | свои компоненты |
| Временные ряды баллов | ограниченно | нет | нет | базово | отлично | ECharts позднее |
| Анализ тем/ошибок | ограниченно | нет | нет | базово | отлично | ECharts позднее |

### Оценка зависимостей

#### FullCalendar Standard

1. Решает интерактивные day/week/month views, drag-and-drop и resize.
2. Собственная полноценная сетка сложнее из-за overlap, touch и accessibility.
3. Использовать только React adapter, timeGrid/dayGrid/list и interaction.
4. Не использовать Premium resource timeline/columns.
5. Standard — MIT; Premium требует отдельной коммерческой лицензии.
6. Загружать динамически только в staff schedule route.
7. На телефоне отдавать list view, сетку — от tablet.
8. Заменим через adapter `CalendarView` и нейтральную event DTO.

#### Cal.diy ideas

1. Даёт проверенные идеи UTC, availability, buffer, recurrence, exceptions и conflicts.
2. Не устанавливается и не копируется.
3. Используются только принципы модели времени.
4. Не используются booking marketplace, workflows, integrations и teams.
5. Текущий Cal.diy заявляет MIT, но это не делает его production-зависимостью.
6. Нулевое влияние на bundle.
7. Мобильный UX проектируется отдельно для школы.
8. Vendor lock-in отсутствует.

#### Tremor

Apache-2.0, Tailwind/Radix и copy-paste подход. Не подключается: даёт корпоративный dashboard-визуал, дублирует текущие primitives и не решает уникальную аналитику. Можно точечно изучать accessibility patterns без зависимости.

#### Apache ECharts

1. Решает многосерийные графики, темы, scatter/heatmap и сложные tooltip.
2. Самописные SVG-графики хуже по масштабу функций.
3. Позднее использовать `echarts/core`, Line/Bar, Grid, Tooltip, Dataset, Aria и SVG renderer.
4. Не импортировать полный пакет, карты, 3D и экзотические серии.
5. Apache-2.0.
6. Только lazy client component; модульные импорты и route-level split.
7. На телефоне сокращать серии и всегда давать табличную альтернативу.
8. Adapter принимает простые series DTO, поэтому библиотека заменима.

