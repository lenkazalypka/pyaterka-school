# Visual QA foundation elio

Дата: 21 августа 2026
Среда: production build Next.js 16.3.1, Chromium headless, locale `ru-RU`, timezone `Asia/Yakutsk`.

## Матрица

Проверены 30 сочетаний: пять маршрутов × шесть viewport.

| Маршрут | Проверенное состояние |
|---|---|
| `/` | public foundation, product preview, subjects, plans, FAQ, CTA и footer |
| `/login` | auth form и recovery action |
| `/start` | первый шаг plan builder и sticky mobile CTA |
| `/student` | честный offline state при ненастроенном локальном Supabase |
| `/student/lessons/:id` | unauthenticated redirect на `/login`; содержимое урока не считается проверенным |

Viewport: `360×800`, `390×844`, `430×932`, `768×1024`, `1280×800`, `1440×900`.

## Результат

- 30/30 навигаций получили HTTP 200, включая итоговую login-страницу после ожидаемого redirect защищённого lesson route.
- Ни в одном viewport нет горизонтального scroll.
- Автоматический поиск видимых `a`, `button`, `summary`, `input`, `select` не нашёл цели меньше 44×44 px.
- Console errors и page errors: 0.
- Первый keyboard focus — skip link с видимым solid outline 3 px.
- Вручную просмотрены mobile и desktop public, mobile `/start`, mobile student offline state и новый favicon.
- Заголовок `/start` читается как «Какой экзамен ты сдаёшь?»; предыдущая склейка слов устранена.
- Из product preview удалены фиксированные количества занятий и заданий: макет не имитирует реальные данные ученика.

## Найдено и исправлено

| Проблема | Исправление | Повторная проверка |
|---|---|---|
| старый favicon с цифрой 5 оставался пользовательской surface | ICO пересобран из route-and-point знака elio | новый raster просмотрен вручную |
| brand primary с белым и muted text с page background не достигали 4.5:1 | токены заменены на `#B34D33` и `#626D67` | расчёт контраста: 5.22:1 и 4.76:1 |
| product preview показывал фиксированные «2 занятия / 2 задания» | числовые mock-метрики заменены названиями разделов | mobile/desktop screenshots |
| текст заголовка `/start` склеивался для assistive/text extraction | добавлен явный пробел между строками | итоговый `textContent` корректен |
| menu, inline actions и subject links имели цели меньше 44 px | заданы semantic min targets без изменения визуальной иерархии | автоматический detector: 0 малых целей |
| offline кабинет говорил о внутренней технологии | показано пользовательское состояние без названия провайдера | mobile screenshot |

## Ограничения и оставшийся риск

- Authenticated student dashboard, расписание, lesson detail, private materials и разные роли нельзя было проверить визуально без локального Supabase и seed-сессий.
- Headless screenshot review не заменяет проверку VoiceOver/TalkBack и физического touch на устройстве.
- Screenshot-файлы этой проверки находятся во временном QA-каталоге `/tmp/elio-visual-qa-after` и не являются стабильным regression baseline.

До merge нужны production-like visual smoke tests как минимум для `student`, `parent`, `teacher`, `curator`, `admin`, а также урока с private material и состояний loading/error/empty.
