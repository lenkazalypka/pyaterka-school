export type DiagnosticQuestion = {
  id: string;
  level: "База" | "Профиль";
  topic: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  explanation: string;
};

export type DiagnosticSubject = {
  slug: string;
  name: string;
  glyph: string;
  tone: string;
  intro: string;
  questions: readonly DiagnosticQuestion[];
};

export const diagnosticSubjects = {
  math: {
    slug: "math", name: "Математика", glyph: "x²", tone: "math",
    intro: "Проверим вычисления, геометрию, вероятность и задачи повышенного уровня.",
    questions: [
      { id: "math-1", level: "База", topic: "Линейные уравнения", prompt: "Решите уравнение: 3x + 6 = 18.", options: ["3", "4", "6", "8"], correctIndex: 1, explanation: "Вычитаем 6 из обеих частей и делим 12 на 3: x = 4." },
      { id: "math-2", level: "База", topic: "Геометрия", prompt: "Катеты прямоугольного треугольника равны 6 и 8. Чему равна гипотенуза?", options: ["10", "12", "14", "48"], correctIndex: 0, explanation: "По теореме Пифагора: √(6² + 8²) = √100 = 10." },
      { id: "math-3", level: "База", topic: "Вероятность", prompt: "Игральную кость бросают один раз. Какова вероятность получить чётное число?", options: ["1/6", "1/3", "1/2", "2/3"], correctIndex: 2, explanation: "Чётных исходов три: 2, 4 и 6. Всего исходов шесть, поэтому 3/6 = 1/2." },
      { id: "math-4", level: "Профиль", topic: "Квадратные уравнения", prompt: "Какие корни имеет уравнение x² − 5x + 6 = 0?", options: ["1 и 6", "−2 и −3", "2 и 3", "Корней нет"], correctIndex: 2, explanation: "Уравнение раскладывается на (x − 2)(x − 3) = 0." },
      { id: "math-5", level: "Профиль", topic: "Производная", prompt: "Найдите значение производной функции f(x) = x³ в точке x = 2.", options: ["6", "8", "12", "16"], correctIndex: 2, explanation: "f′(x) = 3x², значит f′(2) = 3 · 4 = 12." },
    ],
  },
  russian: {
    slug: "russian", name: "Русский язык", glyph: "А", tone: "russian",
    intro: "Проверим орфоэпию, орфографию, пунктуацию и грамматические нормы.",
    questions: [
      { id: "russian-1", level: "База", topic: "Орфоэпия", prompt: "В каком слове верно выделена ударная гласная?", options: ["звОнит", "звонИт", "красивЕе", "тОрты (ед. число)"], correctIndex: 1, explanation: "Нормативное ударение: звонИт. В слове «красивее» ударение падает на И, а «торты» — форма множественного числа." },
      { id: "russian-2", level: "База", topic: "Орфография", prompt: "Какое слово написано правильно?", options: ["придти", "прийти", "прийдти", "прейти"], correctIndex: 1, explanation: "Современная нормативная форма — «прийти»." },
      { id: "russian-3", level: "База", topic: "Пунктуация", prompt: "В каком предложении знаки препинания расставлены верно?", options: ["Книга прочитанная вчера, лежит на столе.", "Книга, прочитанная вчера лежит на столе.", "Книга, прочитанная вчера, лежит на столе.", "Книга прочитанная вчера лежит, на столе."], correctIndex: 2, explanation: "Распространённое определение после определяемого слова обособляется с двух сторон." },
      { id: "russian-4", level: "Профиль", topic: "Н и НН", prompt: "Выберите правильное написание.", options: ["решеная задача", "решённая задача", "решёная задача", "решонная задача"], correctIndex: 1, explanation: "В полном страдательном причастии «решённая» пишется НН." },
      { id: "russian-5", level: "Профиль", topic: "Грамматические нормы", prompt: "Какое предложение построено грамматически верно?", options: ["Благодаря поддержки учителя я справился.", "Оплатив проезд, автобус тронулся.", "Благодаря поддержке учителя я справился.", "Все, кто пришёл, получил задание."], correctIndex: 2, explanation: "Предлог «благодаря» требует дательного падежа: благодаря поддержке." },
    ],
  },
  social: {
    slug: "social", name: "Обществознание", glyph: "§", tone: "social",
    intro: "Проверим право, экономику, социальные отношения и устройство государства.",
    questions: [
      { id: "social-1", level: "База", topic: "Государство", prompt: "Какой орган принимает федеральные законы в России?", options: ["Правительство РФ", "Федеральное Собрание", "Конституционный Суд", "Прокуратура"], correctIndex: 1, explanation: "Федеральное Собрание — парламент России и законодательный орган." },
      { id: "social-2", level: "База", topic: "Экономика", prompt: "Что обычно происходит с равновесной ценой, если спрос растёт, а предложение не меняется?", options: ["Снижается", "Растёт", "Всегда остаётся прежней", "Исчезает"], correctIndex: 1, explanation: "При прочих равных рост спроса сдвигает равновесие к более высокой цене." },
      { id: "social-3", level: "База", topic: "Право", prompt: "Когда возникает гражданская правоспособность человека?", options: ["С рождения", "С 14 лет", "С 18 лет", "После получения паспорта"], correctIndex: 0, explanation: "Гражданская правоспособность возникает в момент рождения и прекращается со смертью." },
      { id: "social-4", level: "Профиль", topic: "Социальная мобильность", prompt: "Какой пример относится к горизонтальной социальной мобильности?", options: ["Повышение до директора", "Переход учителя в другую школу на ту же должность", "Поступление выпускника в вуз", "Лишение руководящей должности"], correctIndex: 1, explanation: "Положение меняется без перехода на более высокий или низкий социальный уровень." },
      { id: "social-5", level: "Профиль", topic: "Конституционное право", prompt: "Какое свойство отличает Конституцию РФ от обычного федерального закона?", options: ["Принимается министерством", "Имеет высшую юридическую силу", "Действует только пять лет", "Регулирует только экономику"], correctIndex: 1, explanation: "Конституция имеет высшую юридическую силу и прямое действие." },
    ],
  },
  history: {
    slug: "history", name: "История", glyph: "19", tone: "history",
    intro: "Проверим ключевые даты, реформы и события российской истории.",
    questions: [
      { id: "history-1", level: "База", topic: "Древняя Русь", prompt: "В каком году произошло Крещение Руси?", options: ["862", "988", "1147", "1240"], correctIndex: 1, explanation: "Крещение Руси князем Владимиром традиционно датируют 988 годом." },
      { id: "history-2", level: "База", topic: "Средневековая Русь", prompt: "Когда состоялась Куликовская битва?", options: ["1242", "1380", "1480", "1612"], correctIndex: 1, explanation: "Куликовская битва войск Дмитрия Донского и Мамая произошла в 1380 году." },
      { id: "history-3", level: "База", topic: "Россия XIX века", prompt: "Какое событие произошло в 1861 году?", options: ["Отмена крепостного права", "Восстание декабристов", "Начало Крымской войны", "Первая русская революция"], correctIndex: 0, explanation: "Манифест об отмене крепостного права был подписан Александром II в 1861 году." },
      { id: "history-4", level: "Профиль", topic: "СССР в 1920-е", prompt: "В каком году был провозглашён переход к НЭПу?", options: ["1917", "1918", "1921", "1928"], correctIndex: 2, explanation: "Решение о переходе к новой экономической политике приняли в 1921 году." },
      { id: "history-5", level: "Профиль", topic: "Великая Отечественная война", prompt: "Какими годами датируется Сталинградская битва?", options: ["1941–1942", "1942–1943", "1943–1944", "1944–1945"], correctIndex: 1, explanation: "Сталинградская битва продолжалась с июля 1942 года по февраль 1943 года." },
    ],
  },
  informatics: {
    slug: "informatics", name: "Информатика", glyph: "</>", tone: "it",
    intro: "Проверим системы счисления, логику, таблицы и чтение программного кода.",
    questions: [
      { id: "informatics-1", level: "База", topic: "Системы счисления", prompt: "Чему равно двоичное число 1010₂ в десятичной системе?", options: ["8", "10", "12", "14"], correctIndex: 1, explanation: "1·8 + 0·4 + 1·2 + 0·1 = 10." },
      { id: "informatics-2", level: "База", topic: "Измерение информации", prompt: "Сколько байт в одном кибибайте (КиБ)?", options: ["100", "1000", "1024", "2048"], correctIndex: 2, explanation: "Один кибибайт равен 2¹⁰, то есть 1024 байтам." },
      { id: "informatics-3", level: "База", topic: "Программирование", prompt: "Что выведет Python-код: sum(range(1, 5))?", options: ["5", "10", "15", "Ошибка"], correctIndex: 1, explanation: "range(1, 5) содержит 1, 2, 3 и 4; их сумма равна 10." },
      { id: "informatics-4", level: "Профиль", topic: "Электронные таблицы", prompt: "Формулу =A1+$B$1 скопировали из B2 в C3. Какой она стала?", options: ["=A1+$B$1", "=B2+$B$1", "=B2+$C$2", "=C3+$B$1"], correctIndex: 1, explanation: "Относительная ссылка A1 сдвигается на столбец и строку, абсолютная $B$1 не меняется." },
      { id: "informatics-5", level: "Профиль", topic: "Логика", prompt: "Чему равно выражение НЕ (1 И 0)?", options: ["0", "1", "Зависит от порядка", "Не определено"], correctIndex: 1, explanation: "1 И 0 равно 0, а отрицание нуля равно 1." },
    ],
  },
  biology: {
    slug: "biology", name: "Биология", glyph: "DNA", tone: "biology",
    intro: "Проверим клетку, генетику, деление клеток и основы экологии.",
    questions: [
      { id: "biology-1", level: "База", topic: "Клетка", prompt: "В какой органелле эукариотической клетки синтезируется основная часть АТФ?", options: ["Лизосома", "Митохондрия", "Рибосома", "Аппарат Гольджи"], correctIndex: 1, explanation: "Основная часть АТФ образуется в митохондриях при клеточном дыхании." },
      { id: "biology-2", level: "База", topic: "Генетика", prompt: "При скрещивании Aa × Aa какова вероятность генотипа aa?", options: ["0%", "25%", "50%", "75%"], correctIndex: 1, explanation: "Расщепление по генотипу 1 AA : 2 Aa : 1 aa, поэтому вероятность aa равна 25%." },
      { id: "biology-3", level: "База", topic: "Деление клетки", prompt: "Что образуется в результате одного митоза соматической клетки?", options: ["Четыре гаплоидные клетки", "Две генетически сходные клетки", "Одна половая клетка", "Клетки с удвоенным набором хромосом"], correctIndex: 1, explanation: "Митоз даёт две дочерние клетки с тем же набором хромосом, что у исходной." },
      { id: "biology-4", level: "Профиль", topic: "Молекулярная биология", prompt: "Какой принцип комплементарности верен для ДНК?", options: ["A–G и T–C", "A–T и G–C", "A–U и G–C", "A–C и G–T"], correctIndex: 1, explanation: "В ДНК аденин образует пару с тимином, а гуанин — с цитозином." },
      { id: "biology-5", level: "Профиль", topic: "Экология", prompt: "Какие организмы являются продуцентами в большинстве наземных экосистем?", options: ["Грибы", "Хищные животные", "Зелёные растения", "Бактерии-разрушители"], correctIndex: 2, explanation: "Зелёные растения создают органические вещества из неорганических за счёт фотосинтеза." },
    ],
  },
  chemistry: {
    slug: "chemistry", name: "Химия", glyph: "H₂", tone: "chemistry",
    intro: "Проверим расчёты, уравнения реакций, pH и степени окисления.",
    questions: [
      { id: "chemistry-1", level: "База", topic: "Молярная масса", prompt: "Чему равна молярная масса воды H₂O?", options: ["16 г/моль", "18 г/моль", "20 г/моль", "34 г/моль"], correctIndex: 1, explanation: "2·1 + 16 = 18 г/моль." },
      { id: "chemistry-2", level: "База", topic: "Уравнения реакций", prompt: "Какие коэффициенты у уравнения образования воды: H₂ + O₂ → H₂O?", options: ["1, 1, 1", "2, 1, 2", "1, 2, 1", "2, 2, 1"], correctIndex: 1, explanation: "Сбалансированное уравнение: 2H₂ + O₂ → 2H₂O." },
      { id: "chemistry-3", level: "База", topic: "Растворы", prompt: "Какую среду имеет раствор с pH = 3?", options: ["Кислую", "Нейтральную", "Щелочную", "Определить нельзя"], correctIndex: 0, explanation: "Значение pH ниже 7 соответствует кислой среде." },
      { id: "chemistry-4", level: "Профиль", topic: "Степени окисления", prompt: "Какова степень окисления серы в H₂SO₄?", options: ["−2", "+2", "+4", "+6"], correctIndex: 3, explanation: "2·(+1) + x + 4·(−2) = 0, откуда x = +6." },
      { id: "chemistry-5", level: "Профиль", topic: "Количество вещества", prompt: "Сколько частиц содержится в одном моле вещества?", options: ["6,02·10²³", "3,01·10²³", "22,4·10²³", "1,66·10⁻²⁷"], correctIndex: 0, explanation: "Один моль содержит число Авогадро: примерно 6,02·10²³ частиц." },
    ],
  },
  english: {
    slug: "english", name: "Английский язык", glyph: "EN", tone: "english",
    intro: "Проверим времена, условные предложения, пассивный залог и понимание текста.",
    questions: [
      { id: "english-1", level: "База", topic: "Present Perfect", prompt: "Choose the correct form: Anna ___ in Kazan since 2020.", options: ["lives", "lived", "has lived", "is living yesterday"], correctIndex: 2, explanation: "Since указывает на период от прошлого до настоящего, поэтому нужен Present Perfect." },
      { id: "english-2", level: "База", topic: "Passive Voice", prompt: "Choose the correct form: The bridge ___ in 2010.", options: ["built", "was built", "is build", "has building"], correctIndex: 1, explanation: "Для завершённого действия в прошлом в пассивном залоге используется was built." },
      { id: "english-3", level: "База", topic: "Связки в тексте", prompt: "Choose the best word: ___ it was raining, we went for a walk.", options: ["Because", "Although", "Unless", "So"], correctIndex: 1, explanation: "Although выражает контраст: дождь шёл, но прогулка состоялась." },
      { id: "english-4", level: "Профиль", topic: "Conditionals", prompt: "Choose the correct form: If I ___ more time, I would learn another language.", options: ["have", "had", "will have", "have had yesterday"], correctIndex: 1, explanation: "Во втором условном предложении после if используется Past Simple: had." },
      { id: "english-5", level: "Профиль", topic: "Чтение", prompt: "Read: “Mia waited for the bus, but it did not arrive, so she walked to school.” Why did Mia walk?", options: ["She missed school", "The bus did not arrive", "She wanted exercise", "The school was closed"], correctIndex: 1, explanation: "The sentence directly says that the bus did not arrive, so Mia walked." },
    ],
  },
} as const satisfies Record<string, DiagnosticSubject>;

export type DiagnosticSubjectSlug = keyof typeof diagnosticSubjects;

export const diagnosticSubjectSlugs = Object.keys(diagnosticSubjects) as DiagnosticSubjectSlug[];

export function isDiagnosticSubjectSlug(value: string): value is DiagnosticSubjectSlug {
  return value in diagnosticSubjects;
}

export function parseDiagnosticAnswers(value: string | undefined, expectedLength: number): number[] | null {
  if (!value || value.length > 80) return null;
  const answers = value.split(".").map(Number);
  if (answers.length !== expectedLength || answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 9)) return null;
  return answers;
}

export function evaluateDiagnostic(slug: DiagnosticSubjectSlug, answers: number[]) {
  const diagnostic = diagnosticSubjects[slug];
  if (answers.length !== diagnostic.questions.length) return null;
  if (answers.some((answer, index) => answer < 0 || answer >= diagnostic.questions[index].options.length)) return null;
  const correct = answers.reduce((total, answer, index) => total + Number(answer === diagnostic.questions[index].correctIndex), 0);
  const weakTopics = diagnostic.questions
    .filter((question, index) => answers[index] !== question.correctIndex)
    .map((question) => question.topic)
    .filter((topic, index, topics) => topics.indexOf(topic) === index);
  const recommendations = weakTopics.map((topic) => `Разобрать тему «${topic}»`);
  const nextStep = weakTopics[0] ? `Начать с темы «${weakTopics[0]}»` : "Перейти к полному пробному варианту";
  return {
    subject: slug,
    questions: diagnostic.questions.map((question) => question.id),
    answers,
    result: { correct, total: diagnostic.questions.length, percent: Math.round(correct * 100 / diagnostic.questions.length) },
    weak_topics: weakTopics,
    roadmap: weakTopics.map((topic, index) => ({ order: index + 1, topic })),
    recommendations,
    next_step: nextStep,
  };
}
