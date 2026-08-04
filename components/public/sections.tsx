import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { CountUp } from "@/components/public/count-up";
import { FaqAccordion } from "@/components/public/faq-accordion";
import type { PublicPlan } from "@/lib/public-site";

type RevealStyle = CSSProperties & { "--reveal-delay": string };

function revealStyle(index: number): RevealStyle {
  return { "--reveal-delay": `${Math.min(index, 5) * 70}ms` };
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

const faq = [
  ["Можно готовиться сразу по нескольким предметам?", "Да. Можно выбрать от одного до четырёх предметов. Точный лимит зависит от тарифа, а итоговая стоимость считается после выбора."],
  ["Что делать, если пропустил занятие?", "Когда преподаватель опубликует запись, она появится вместе с материалами к уроку. Можно посмотреть в удобное время и вернуться к нужному моменту."],
  ["Что видит родитель?", "Только подтверждённые учебные данные: расписание, посещаемость, задания, результаты и отдельные отчёты. Личная переписка ученика не открывается автоматически."],
  ["Нужно сразу оплачивать обучение?", "Нет. Сначала можно создать аккаунт, выбрать предметы и собрать план. Сейчас подписку подтверждает администратор школы вручную."],
  ["Вы гарантируете поступление?", "Нет. Мы помогаем системно готовиться, разбирать ошибки и следить за прогрессом, но результат экзамена и поступление зависят не только от школы."],
] as const;

export function PublicSections({ plans }: { plans: PublicPlan[] }) {
  return (
    <>
      <div className="v2-marquee" aria-label="Предметы подготовки">
        <div>
          <span>Математика</span><i>★</i><span>Русский</span><i>★</i><span>Обществознание</span><i>★</i><span>Информатика</span><i>★</i><span>Биология</span><i>★</i><span>Химия</span><i>★</i>
          <span aria-hidden="true">Математика</span><i aria-hidden="true">★</i><span aria-hidden="true">Русский</span><i aria-hidden="true">★</i><span aria-hidden="true">Обществознание</span><i aria-hidden="true">★</i><span aria-hidden="true">Информатика</span><i aria-hidden="true">★</i>
        </div>
      </div>

      <section className="v2-section v2-directions" id="directions">
        <div className="public-container">
          <div className="v2-section-head v2-section-head-wide">
            <div><span>Выбери направление</span><h2>Один экзамен.<br /><em>Свой маршрут.</em></h2></div>
            <p>Никаких универсальных анкет: предметы, шкалы и цели меняются под ЕГЭ или ОГЭ.</p>
          </div>
          <div className="v2-direction-grid">
            <article className="v2-direction-card v2-ege-card" data-reveal style={revealStyle(0)}>
              <div className="v2-direction-top"><span className="v2-big-class">11</span><span className="v2-class-label">класс</span></div>
              <div><span className="v2-card-tag">ЕГЭ</span><h3>К баллам для поступления</h3><p>Собери предметы, поставь цель и следи, какие темы уже закрыты, а какие нужно усилить.</p><Link href="/register">Выбрать ЕГЭ <ArrowRight /></Link></div>
              <span className="v2-direction-five" aria-hidden="true">5</span>
            </article>
            <article className="v2-direction-card v2-oge-card" data-reveal style={revealStyle(1)}>
              <div className="v2-direction-top"><span className="v2-big-class">9</span><span className="v2-class-label">класс</span></div>
              <div><span className="v2-card-tag">ОГЭ</span><h3>К уверенной оценке</h3><p>Работай с первичными баллами конкретного предмета, закрывай пробелы и привыкай к формату.</p><Link href="/register">Выбрать ОГЭ <ArrowRight /></Link></div>
              <span className="v2-direction-check" aria-hidden="true">✓</span>
            </article>
          </div>
        </div>
      </section>

      <section className="v2-section v2-format" id="format">
        <div className="public-container v2-format-grid">
          <div className="v2-photo-story">
            <Image src="/brand/study-together-v1.webp" alt="Старшеклассники вместе разбирают задания" fill unoptimized sizes="(max-width: 1023px) 100vw, 54vw" />
            <div className="v2-photo-label"><Play aria-hidden="true" /><span><small>живой разбор</small><b>сложно → понятно</b></span></div>
            <span className="v2-photo-sticker">без зубрёжки</span>
          </div>
          <div className="v2-format-copy">
            <span className="v2-kicker">Как учимся</span>
            <h2>Всегда понятно,<br /><em>что делать сегодня</em></h2>
            <ol className="v2-steps">
              <li data-reveal style={revealStyle(0)}><span>01</span><div><b>Разбираешь тему вживую</b><p>Задаёшь вопросы преподавателю и сохраняешь конспект.</p></div></li>
              <li data-reveal style={revealStyle(1)}><span>02</span><div><b>Пробуешь сам</b><p>Практика показывает, где уже уверенно, а где нужна помощь.</p></div></li>
              <li data-reveal style={revealStyle(2)}><span>03</span><div><b>Получаешь разбор ошибок</b><p>Преподаватель проверяет работу и объясняет сложные места.</p></div></li>
              <li data-reveal style={revealStyle(3)}><span>04</span><div><b>Идёшь к следующей цели</b><p>В расписании — занятия, дедлайны и ближайший важный шаг.</p></div></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="v2-section v2-subjects" id="subjects">
        <div className="public-container">
          <div className="v2-section-head v2-subjects-head v2-heading-band">
            <span>Предметы</span>
            <div className="v2-heading-band-row">
              <h2>Собери свою<br /><em>сильную комбинацию</em></h2>
              <p>Выбирай то, что нужно именно тебе. После направления показываем только подходящие предметы.</p>
            </div>
          </div>
          <div className="v2-subject-grid">
            {subjects.map(([name, tone, glyph], index) => (
              <article className={`v2-subject-card v2-subject-${tone}`} data-reveal key={name} style={revealStyle(index)}>
                <span className="v2-subject-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{glyph}</strong><h3>{name}</h3><ArrowRight aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v2-section v2-teachers">
        <div className="public-container v2-teacher-grid">
          <div className="v2-teacher-title">
            <span className="v2-kicker">Кто будет рядом</span>
            <h2>Не «говорящая голова».<br /><em>Преподаватель, с которым понятно.</em></h2>
            <p>Смотрим не на громкие обещания, а на три вещи: знание экзамена, ясность объяснения и уважительную обратную связь.</p>
            <Link className="button button-dark button-large" href="/register">Начать подготовку <ArrowRight /></Link>
          </div>
          <div className="v2-teacher-criteria" aria-label="Как школа выбирает преподавателей">
            <article data-reveal style={revealStyle(0)}><span>01</span><BookOpenCheck /><h3>Знает экзамен</h3><p>Следит за форматом и критериями по своему предмету.</p></article>
            <article data-reveal style={revealStyle(1)}><span>02</span><MessageCircle /><h3>Объясняет ясно</h3><p>Показывает ход мысли, а не только правильный ответ.</p></article>
            <article data-reveal style={revealStyle(2)}><span>03</span><HeartHandshake /><h3>Даёт обратную связь</h3><p>Разбирает ошибку спокойно и помогает попробовать снова.</p></article>
          </div>
        </div>
      </section>

      <section className="v2-section v2-proof">
        <div className="public-container">
          <div className="v2-proof-heading"><h2>Не обещания.<br />Понятный ритм.</h2><span>Что уже заложено в подготовку</span></div>
          <div className="v2-proof-grid">
            <article><strong>1–4</strong><span>предмета в одном плане</span><Route /></article>
            <article><CountUp to={8} /><span>коротких шагов до старта</span><Target /></article>
            <article><CountUp to={2} /><span>пробника в месяц по правилам тарифа</span><ClipboardCheck /></article>
            <article><strong>24/7</strong><span>доступ к опубликованным записям</span><Clock3 /></article>
          </div>
        </div>
      </section>

      <section className="v2-section v2-plans" id="plans">
        <div className="public-container">
          <div className="v2-section-head v2-plans-head v2-heading-centered">
            <div><span>Тарифы</span><h2>Выбери,<br /><em>сколько поддержки нужно</em></h2></div>
            <p>{plans.some((plan) => plan.priceLabel) ? "Показываем актуальную стоимость активных пакетов." : "Состав пакетов уже виден. Точную стоимость посчитаем после выбора предметов."}</p>
          </div>
          <div className="v2-plan-grid">
            {plans.map((plan, index) => (
              <article className={`v2-plan-card ${index === 1 ? "is-featured" : ""}`} data-reveal key={plan.code} style={revealStyle(index)}>
                {index === 1 && <span className="v2-plan-badge"><Sparkles /> выбор с поддержкой</span>}
                <span className="v2-plan-number">0{index + 1}</span>
                <h3>{plan.name}</h3>
                <p className="v2-plan-price">{plan.priceLabel ?? "Цена после выбора предметов"}</p>
                <ul>{plan.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
                <Link className={`button button-large ${index === 1 ? "button-primary" : "button-secondary"}`} href="/register">Выбрать <ArrowRight /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v2-section v2-trust">
        <div className="public-container v2-trust-panel">
          <div><span className="v2-kicker">Спокойно для родителей</span><h2>Условия —<br />без мелкого шрифта</h2></div>
          <div className="v2-trust-list">
            <article data-reveal style={revealStyle(0)}><ShieldCheck /><div><b>Договор до оплаты</b><p>Можно заранее прочитать условия и задать вопросы.</p></div></article>
            <article data-reveal style={revealStyle(1)}><GraduationCap /><div><b>Материнский капитал</b><p>Проверим доступность и список документов до оформления.</p></div></article>
            <article data-reveal style={revealStyle(2)}><CalendarDays /><div><b>Статус подписки</b><p>Оплата и срок обучения видны в аккаунте.</p></div></article>
          </div>
        </div>
      </section>

      <section className="v2-section v2-faq" id="faq">
        <div className="public-container v2-faq-grid">
          <div className="v2-faq-title"><span className="v2-kicker">Вопросы</span><h2>Спросить —<br />нормально</h2><p>Собрали короткие ответы о старте, занятиях и доступе родителя.</p></div>
          <FaqAccordion items={faq} />
        </div>
      </section>

      <section className="v2-section v2-final">
        <div className="public-container v2-final-card">
          <div className="v2-final-copy"><span className="v2-kicker">Первый шаг</span><h2>Собери план,<br /><em>который ведёт к цели</em></h2><p>Имя и email перенесутся в регистрацию. Ничего оплачивать на этом шаге не нужно.</p><span className="v2-final-five" aria-hidden="true">5</span></div>
          <form className="v2-start-form" action="/register" method="get">
            <label>Имя<input name="name" autoComplete="given-name" minLength={2} required placeholder="Как к тебе обращаться" /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.ru" /></label>
            <button className="button button-primary button-large" type="submit">Собрать план <ArrowRight /></button>
            <small>Дальше — регистрация и согласие на обработку персональных данных.</small>
          </form>
        </div>
      </section>
    </>
  );
}
