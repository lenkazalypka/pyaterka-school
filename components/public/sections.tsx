import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { CountUp } from "@/components/public/count-up";
import { FaqAccordion } from "@/components/public/faq-accordion";
import type { PublicPlan } from "@/lib/public-site";

type RevealStyle = CSSProperties & { "--reveal-delay": string };
type ComparisonState = "yes" | "no" | "depends";
type Testimonial = {
  name: string;
  subject: string;
  result: string;
  quote: string;
  avatar: string;
};

function revealStyle(index: number): RevealStyle {
  return { "--reveal-delay": `${Math.min(index, 6) * 70}ms` };
}

const subjects = [
  ["Математика", "math", "x²"],
  ["Русский язык", "russian", "А"],
  ["Обществознание", "social", "§"],
  ["История", "history", "19"],
  ["Информатика", "it", "</>"],
  ["Биология", "biology", "DNA"],
  ["Химия", "chemistry", "H₂"],
  ["Английский", "english", "EN"],
] as const;

const comparisonRows: Array<{
  label: string;
  tutor: ComparisonState;
  solo: ComparisonState;
  school: ComparisonState;
}> = [
  { label: "Единый план по всем предметам", tutor: "depends", solo: "depends", school: "yes" },
  { label: "Живые занятия и записи", tutor: "depends", solo: "no", school: "yes" },
  { label: "Проверка работ", tutor: "yes", solo: "no", school: "yes" },
  { label: "Пробники и разбор ошибок", tutor: "depends", solo: "depends", school: "yes" },
  { label: "Отчёт о прогрессе родителю", tutor: "depends", solo: "no", school: "depends" },
];

// Публикуем отзывы только после проверки результата и согласия ученика на фото и цитату.
const approvedTestimonials: Testimonial[] = [];

const faq = [
  ["Можно готовиться сразу по нескольким предметам?", "Да. Можно выбрать от одного до четырёх предметов. Точный лимит зависит от тарифа, а итоговая стоимость рассчитывается после выбора."],
  ["Что делать, если пропустил занятие?", "После публикации запись появится вместе с материалами к уроку. Можно посмотреть её в удобное время и вернуться к нужному моменту."],
  ["Что видит родитель?", "Расписание, посещаемость, задания, результаты и учебные отчёты. Личная переписка ученика не открывается автоматически."],
  ["Нужно сразу оплачивать обучение?", "Нет. Сначала можно создать аккаунт, выбрать экзамен, предметы и собрать план подготовки."],
  ["Вы гарантируете поступление?", "Нет. Мы выстраиваем системную подготовку, разбираем ошибки и помогаем следить за прогрессом, но итог зависит и от работы самого ученика."],
] as const;

function FeatureMark({ value }: { value: ComparisonState }) {
  if (value === "yes") {
    return <span className="v9-yes" aria-label="Включено"><CheckCircle2 aria-hidden="true" /><small>да</small></span>;
  }
  if (value === "depends") {
    return <span className="v9-depends" aria-label="Зависит от формата"><CircleHelp aria-hidden="true" /><small>зависит</small></span>;
  }
  return <span className="v9-no" aria-label="Не включено"><CircleMinus aria-hidden="true" /><small>нет</small></span>;
}

function TestimonialsSection() {
  if (approvedTestimonials.length === 0) return null;

  return (
    <section className="v2-section v9-testimonials" aria-labelledby="reviews-title">
      <div className="public-container">
        <div className="v9-section-heading" data-reveal>
          <span className="v9-kicker">Результаты учеников</span>
          <h2 id="reviews-title">Не рекламные обещания.<br /><em>Личный опыт подготовки.</em></h2>
        </div>
        <div className="v9-testimonial-rail" role="list" aria-label="Отзывы учеников">
          {approvedTestimonials.map((testimonial, index) => (
            <article role="listitem" data-reveal style={revealStyle(index)} key={`${testimonial.name}-${testimonial.subject}`}>
              <div className="v9-testimonial-person">
                <Image src={testimonial.avatar} alt="" width={56} height={56} />
                <div><strong>{testimonial.name}</strong><span>{testimonial.subject} · {testimonial.result}</span></div>
              </div>
              <blockquote>«{testimonial.quote}»</blockquote>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicSections({ plans }: { plans: PublicPlan[] }) {
  return (
    <>
      <div className="v2-marquee v9-marquee" aria-label="Что входит в подготовку">
        <div>
          <span>Живые занятия</span><i>✦</i><span>Разбор ошибок</span><i>✦</i><span>Записи уроков</span><i>✦</i><span>Пробники</span><i>✦</i><span>План поступления</span><i>✦</i>
          <span aria-hidden="true">Живые занятия</span><i aria-hidden="true">✦</i><span aria-hidden="true">Разбор ошибок</span><i aria-hidden="true">✦</i><span aria-hidden="true">Записи уроков</span><i aria-hidden="true">✦</i>
        </div>
      </div>

      <section className="v9-proof-strip" aria-label="Возможности платформы">
        <div className="public-container v9-proof-grid">
          <article data-reveal><strong>1–4</strong><span>предмета в одном плане</span><Route aria-hidden="true" /></article>
          <article data-reveal><CountUp to={8} /><span>понятных шагов до старта</span><Target aria-hidden="true" /></article>
          <article data-reveal><CountUp to={2} /><span>пробника в месяц по правилам тарифа</span><ClipboardCheck aria-hidden="true" /></article>
          <article data-reveal><strong>24/7</strong><span>доступ к опубликованным записям</span><Clock3 aria-hidden="true" /></article>
        </div>
      </section>

      <section className="v2-section v9-launch-proof" aria-labelledby="launch-proof-title">
        <div className="public-container">
          <div className="v9-section-heading" data-reveal>
            <span className="v9-kicker">Честно о старте</span>
            <h2 id="launch-proof-title">Набор открыт.<br /><em>Первые ученики уже готовятся.</em></h2>
            <p>Мы не подменяем первые результаты красивой статистикой. Опубликуем цифры только после проверки и с понятной методикой подсчёта.</p>
          </div>
          <div className="v9-launch-signals" role="list" aria-label="Проверяемые факты о школе">
            <article role="listitem" data-reveal style={revealStyle(0)}>
              <span>сейчас</span><strong>Идёт первый набор</strong><p>Можно выбрать ЕГЭ или ОГЭ и собрать план по нужным предметам.</p>
            </article>
            <article role="listitem" data-reveal style={revealStyle(1)}>
              <span>без приписок</span><strong>Результаты проверяем</strong><p>Баллы и отзывы появятся после подтверждения учениками и родителями.</p>
            </article>
            <article role="listitem" data-reveal style={revealStyle(2)}>
              <span>8 предметов</span><strong>Один учебный кабинет</strong><p>Расписание, материалы и прогресс собраны в одном месте.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="v2-section v9-directions" id="directions">
        <div className="public-container">
          <div className="v9-section-heading" data-reveal>
            <span className="v9-kicker">Выбери свой экзамен 🎯</span>
            <h2>Не «учить всё».<br /><em>Бить точно в свою цель.</em></h2>
            <p>ЕГЭ и ОГЭ — разные маршруты. Поэтому предметы, шкалы и план подготовки настраиваются отдельно.</p>
          </div>
          <div className="v9-direction-grid">
            <article className="v9-direction-card is-ege" data-reveal style={revealStyle(0)}>
              <div><span className="v9-big-number">11</span><small>класс</small></div>
              <span className="v9-card-tag">ЕГЭ</span>
              <h3>К баллам для поступления</h3>
              <p>Выбираешь предметы и вузы, ставишь целевой балл и видишь, какие темы нужно усилить.</p>
              <Link href="/register">Собрать план ЕГЭ <ArrowRight aria-hidden="true" /></Link>
            </article>
            <article className="v9-direction-card is-oge" data-reveal style={revealStyle(1)}>
              <div><span className="v9-big-number">9</span><small>класс</small></div>
              <span className="v9-card-tag">ОГЭ</span>
              <h3>К уверенной оценке</h3>
              <p>Закрываешь пробелы, привыкаешь к формату и тренируешься по шкале выбранного предмета.</p>
              <Link href="/register">Собрать план ОГЭ <ArrowRight aria-hidden="true" /></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="v2-section v9-problem-solution" aria-labelledby="problem-title">
        <div className="public-container v9-problem-grid">
          <div className="v9-problem" data-reveal>
            <span>До «Пятёрки»</span>
            <h2 id="problem-title">«Делаю много.<br />А балл не растёт»</h2>
            <ul><li>темы вперемешку</li><li>дедлайны теряются</li><li>ошибки повторяются</li></ul>
          </div>
          <div className="v9-solution" data-reveal>
            <span>С «Пятёркой»</span>
            <h2>Понимаешь,<br /><em>что делать сегодня</em> ✅</h2>
            <ul><li><Check aria-hidden="true" /> ближайшее занятие</li><li><Check aria-hidden="true" /> задачи по приоритету</li><li><Check aria-hidden="true" /> разбор слабых тем</li></ul>
          </div>
        </div>
      </section>

      <section className="v2-section v9-format" id="format">
        <div className="public-container">
          <div className="v9-section-heading is-centered" data-reveal>
            <span className="v9-kicker">Как учимся 🔥</span>
            <h2>Один понятный цикл.<br /><em>Неделя за неделей.</em></h2>
            <p>Без марафона из случайных вебинаров: каждое действие связано со следующим.</p>
          </div>
          <ol className="v9-learning-steps">
            <li data-reveal style={revealStyle(0)}><span>01</span><BookOpenCheck aria-hidden="true" /><h3>Разбираешь тему</h3><p>Живой урок, вопросы преподавателю и материалы в кабинете.</p></li>
            <li data-reveal style={revealStyle(1)}><span>02</span><Target aria-hidden="true" /><h3>Пробуешь сам</h3><p>Практика сразу показывает, что уже понятно, а где остался пробел.</p></li>
            <li data-reveal style={revealStyle(2)}><span>03</span><MessageCircle aria-hidden="true" /><h3>Получаешь разбор</h3><p>Не просто «неверно», а объяснение ошибки и следующий шаг.</p></li>
            <li data-reveal style={revealStyle(3)}><span>04</span><Route aria-hidden="true" /><h3>Двигаешься дальше</h3><p>Расписание и прогресс помогают не выпадать из подготовки.</p></li>
          </ol>
        </div>
      </section>

      <section className="v2-section v9-subjects" id="subjects">
        <div className="public-container">
          <div className="v9-section-heading" data-reveal>
            <span className="v9-kicker">Предметы</span>
            <h2>Собери комбинацию,<br /><em>которая нужна тебе.</em></h2>
            <p>Один предмет или сразу четыре — всё остаётся в одном расписании и одном кабинете.</p>
          </div>
          <div className="v9-subject-grid">
            {subjects.map(([name, tone, glyph], index) => (
              <Link className={`v9-subject-card tone-${tone}`} href="/register" data-reveal key={name} style={revealStyle(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span><strong>{glyph}</strong><h3>{name}</h3><ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="v2-section v9-teachers" aria-labelledby="teachers-title">
        <div className="public-container">
          <div className="v9-section-heading" data-reveal>
            <span className="v9-kicker">Преподаватели</span>
            <h2 id="teachers-title">Не звезда в кадре.<br /><em>Человек, который объясняет.</em></h2>
            <p>Профили с именами и результатами публикуются только после проверки данных. Пока показываем критерии отбора — без выдуманных регалий.</p>
          </div>
          <div className="v9-teacher-rail" role="list" aria-label="Критерии отбора преподавателей">
            <article role="listitem" data-reveal><span>01</span><BookOpenCheck aria-hidden="true" /><h3>Знает актуальный экзамен</h3><p>Работает с форматом, критериями и изменениями по своему предмету.</p><b>экспертиза</b></article>
            <article role="listitem" data-reveal><span>02</span><MessageCircle aria-hidden="true" /><h3>Объясняет ход мысли</h3><p>Ученик понимает не только ответ, но и способ решения.</p><b>ясность</b></article>
            <article role="listitem" data-reveal><span>03</span><HeartHandshake aria-hidden="true" /><h3>Даёт нормальную обратную связь</h3><p>Разбирает ошибку спокойно и помогает попробовать ещё раз.</p><b>поддержка</b></article>
            <article role="listitem" data-reveal><span>04</span><ClipboardCheck aria-hidden="true" /><h3>Следит за прогрессом</h3><p>Связывает урок, практику и результаты пробников в одну картину.</p><b>система</b></article>
          </div>
          <Link className="button button-dark button-large" href="/register">Выбрать предмет <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="v2-section v9-comparison" id="comparison">
        <div className="public-container">
          <div className="v9-section-heading is-centered" data-reveal>
            <span className="v9-kicker">Сравним честно</span>
            <h2>Готовиться можно по-разному.<br /><em>Выбирай удобную тебе систему.</em></h2>
          </div>
          <div className="v9-comparison-wrap" data-reveal>
            <div className="v9-comparison-head"><span>Что получаешь</span><strong>Репетитор</strong><strong>Самостоятельно</strong><strong className="is-brand">Пятёрка</strong></div>
            {comparisonRows.map(({ label, tutor, solo, school }) => (
              <div className="v9-comparison-row" key={label}><span>{label}</span><FeatureMark value={tutor} /><FeatureMark value={solo} /><FeatureMark value={school} /></div>
            ))}
            <div className="v9-comparison-price"><span>Стоимость</span><b>зависит от предмета и преподавателя</b><b>можно начать бесплатно</b><b>по выбранному тарифу и предметам</b></div>
          </div>
          <p className="v9-comparison-note">Сравнение описывает формат, а не качество конкретного преподавателя или самостоятельной подготовки. Актуальная цена «Пятёрки» выводится только из Supabase.</p>
        </div>
      </section>

      <TestimonialsSection />

      <section className="v2-section v9-plans" id="plans">
        <div className="public-container">
          <div className="v9-section-heading is-centered" data-reveal>
            <span className="v9-kicker">Тарифы</span>
            <h2>Выбери не «подороже».<br /><em>Выбери нужный уровень поддержки.</em></h2>
            <p>{plans.some((plan) => plan.priceLabel) ? "Показываем актуальную стоимость активных пакетов." : "Состав пакетов уже виден. Точную стоимость посчитаем после выбора предметов."}</p>
          </div>
          <div className="v9-plan-grid">
            {plans.map((plan, index) => (
              <article className={`v9-plan-card ${index === 1 ? "is-featured" : ""}`} data-reveal key={plan.code} style={revealStyle(index)}>
                {index === 1 && <span className="v9-plan-badge"><Sparkles aria-hidden="true" /> рекомендуем</span>}
                <span className="v9-plan-index">0{index + 1}</span>
                <h3>{plan.name}</h3>
                <p className="v9-plan-price">{plan.priceLabel ?? "Цена после выбора предметов"}</p>
                <ul>{plan.features.slice(0, 3).map((feature) => <li key={feature}><Check aria-hidden="true" /> {feature}</li>)}</ul>
                {plan.features.length > 3 && (
                  <details className="v9-plan-details"><summary>Все возможности <ChevronDown aria-hidden="true" /></summary><ul>{plan.features.slice(3).map((feature) => <li key={feature}><Check aria-hidden="true" /> {feature}</li>)}</ul></details>
                )}
                <Link className={`button button-large ${index === 1 ? "button-primary" : "button-secondary"}`} href="/register">Выбрать тариф <ArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v2-section v9-trust">
        <div className="public-container v9-trust-panel">
          <div data-reveal><span className="v9-kicker">Для родителей</span><h2>Деньги и прогресс —<br /><em>без сюрпризов.</em></h2></div>
          <div className="v9-trust-list">
            <article data-reveal><ShieldCheck aria-hidden="true" /><div><b>Условия до оплаты</b><p>Сначала можно изучить пакет, план и документы.</p></div></article>
            <article data-reveal><GraduationCap aria-hidden="true" /><div><b>Материнский капитал</b><p>Доступность и комплект документов проверяются до оформления.</p></div></article>
            <article data-reveal><CalendarDays aria-hidden="true" /><div><b>Всё в кабинете</b><p>Расписание, посещаемость, результаты и статус подписки собраны вместе.</p></div></article>
          </div>
        </div>
      </section>

      <section className="v2-section v9-faq" id="faq">
        <div className="public-container v9-faq-grid">
          <div data-reveal><span className="v9-kicker">Вопросы</span><h2>Спросить —<br /><em>нормально.</em></h2><p>Коротко отвечаем о старте, занятиях и оплате.</p></div>
          <FaqAccordion items={faq} />
        </div>
      </section>

      <section className="v2-section v9-final-cta">
        <div className="public-container v9-final-panel" data-reveal>
          <div><span>Готов начать? 🎯</span><h2>Собери план подготовки<br />за 8 понятных шагов.</h2><p>Выбери экзамен, предметы и цель. Оплата на первом шаге не нужна.</p></div>
          <form action="/register" method="get"><button className="button button-primary button-large" type="submit">Начать подготовку <ArrowRight aria-hidden="true" /></button></form>
        </div>
      </section>
    </>
  );
}
