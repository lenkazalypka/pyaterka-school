import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  LockKeyhole,
  Route,
  ShieldCheck,
} from "lucide-react";
import { SubjectIcon } from "@/components/icons/subject-icons";
import { diagnosticSubjects, diagnosticSubjectSlugs } from "@/lib/diagnostic-tests";
import type { PublicPlan } from "@/lib/public-site";
import styles from "./redesign-v1.module.css";

const rhythm = [
  ["01", "Разобраться", "Живое занятие связывает новую тему с экзаменационным заданием."],
  ["02", "Попробовать", "Практика показывает конкретный пробел, а не абстрактный процент прогресса."],
  ["03", "Исправить", "Домашняя работа, разбор и материалы остаются рядом с уроком."],
  ["04", "Продолжить", "Расписание возвращает к следующему важному действию без лишнего шума."],
] as const;

const faq = [
  ["Можно готовиться по нескольким предметам?", "Да. Можно выбрать от одного до четырёх предметов. Точный лимит зависит от пакета и виден до оплаты."],
  ["Что будет, если пропустить занятие?", "После публикации запись и материалы останутся внутри урока. Доступ определяется активной подпиской на предмет."],
  ["Что видит родитель?", "Только подтверждённые учебные данные ребёнка. Личная переписка ученика не открывается автоматически."],
  ["Когда нужно оплачивать?", "Сначала можно выбрать экзамен, предметы, цель и пакет. Доступ активируется только после подтверждения оплаты платёжным сервисом."],
  ["Вы гарантируете нужный балл?", "Нет. elio помогает выстроить подготовку и видеть следующий шаг, но результат зависит от многих факторов, включая работу самого ученика."],
] as const;

export function PublicSections({ plans }: { plans: PublicPlan[] }) {
  return (
    <>
      <section className={styles.platform} id="platform" aria-labelledby="platform-title">
        <div className={styles.sectionIntro}>
          <span>Рабочее пространство ученика</span>
          <h2 id="platform-title">понятно за несколько секунд.</h2>
          <p>Не витрина с десятком показателей, а собранная картина: что срочно, что дальше и где лежит всё нужное.</p>
        </div>
        <div className={styles.platformGrid}>
          <article className={styles.platformPrimary}>
            <div><Route aria-hidden="true" /><span>фокус</span></div>
            <h3>Одно следующее действие</h3>
            <p>Ближайший урок или важное задание становится главным элементом экрана. Остальное остаётся доступным, но не конкурирует за внимание.</p>
            <div className={styles.focusDemo}><small>сегодня · до 21:00</small><b>Закончить план сочинения</b><span>Русский язык <ArrowRight aria-hidden="true" /></span></div>
          </article>
          <div className={styles.platformStack}>
            <article><CalendarDays aria-hidden="true" /><div><h3>Время без путаницы</h3><p>Расписание отображается в часовом поясе ученика.</p></div></article>
            <article><BookOpen aria-hidden="true" /><div><h3>Контекст не теряется</h3><p>Запись, материалы и домашняя работа связаны с конкретным уроком.</p></div></article>
            <article><LockKeyhole aria-hidden="true" /><div><h3>Приватность по умолчанию</h3><p>Материалы открываются только тем, у кого есть доступ к предмету.</p></div></article>
          </div>
        </div>
      </section>

      <section className={styles.rhythm} id="rhythm" aria-labelledby="rhythm-title">
        <div className={styles.rhythmIntro}><span>Учебный ритм</span><h2 id="rhythm-title">не марафон.<br />повторяемый цикл.</h2><p>Неделя остаётся предсказуемой, а работа постепенно становится самостоятельнее.</p></div>
        <ol className={styles.rhythmList}>
          {rhythm.map(([index, title, copy]) => <li key={index}><span>{index}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}
        </ol>
      </section>

      <section className={styles.subjects} id="subjects" aria-labelledby="subjects-title">
        <div className={styles.sectionIntro}>
          <span>Предметы</span>
          <h2 id="subjects-title">один кабинет для своей комбинации.</h2>
          <p>Диагностика помогает начать с текущего уровня. Она не обещает результат и не подменяет полноценную проверку преподавателем.</p>
        </div>
        <div className={styles.subjectGrid}>
          {diagnosticSubjectSlugs.map((slug, index) => {
            const subject = diagnosticSubjects[slug];
            return <article key={slug}><span>{String(index + 1).padStart(2, "0")}</span><SubjectIcon subject={slug} /><h3>{subject.name}</h3><div><Link href={`/test/${subject.slug}`}>Диагностика</Link><Link href={`/start?subject=${slug}`} aria-label={`Выбрать ${subject.name}`}><ArrowRight aria-hidden="true" /></Link></div></article>;
          })}
        </div>
      </section>

      <section className={styles.plans} id="plans" aria-labelledby="plans-title">
        <div className={styles.sectionIntro}>
          <span>Пакеты</span>
          <h2 id="plans-title">платить за нужный уровень поддержки.</h2>
          <p>{plans.some((plan) => plan.priceLabel) ? "Стоимость загружается из активных тарифов Supabase. Итог зависит от выбранных предметов." : "Состав пакетов уже виден. Цена появится только после публикации активных тарифов в Supabase."}</p>
        </div>
        <div className={styles.planGrid}>
          {plans.map((plan, index) => <article className={index === 1 ? styles.planFeatured : styles.planCard} key={plan.code}>
            <div className={styles.planHeading}><span>пакет {String(index + 1).padStart(2, "0")}</span><small>до {plan.maxSubjects} {plan.maxSubjects === 1 ? "предмета" : "предметов"}</small></div>
            <h3>{plan.name}</h3>
            <p className={styles.planPrice}>{plan.priceLabel ?? "Цена появится до оплаты"}</p>
            <ul>{plan.features.map((feature) => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
            <Link href={`/start?plan=${encodeURIComponent(plan.code)}`}>Выбрать и продолжить <ArrowRight aria-hidden="true" /></Link>
          </article>)}
        </div>
      </section>

      <section className={styles.trust} aria-labelledby="trust-title">
        <div><span>Для семьи</span><h2 id="trust-title">контроль без вторжения.</h2><p>Родительский доступ создаётся только после подтверждённого приглашения и не раскрывает личную переписку ученика.</p></div>
        <div className={styles.trustFacts}>
          <article><ShieldCheck aria-hidden="true" /><b>Роли проверяются на сервере</b><p>Frontend guard не считается границей доступа.</p></article>
          <article><Clock3 aria-hidden="true" /><b>Разные часовые пояса</b><p>Время хранится с зоной и показывается для конкретного ученика.</p></article>
          <article><FileText aria-hidden="true" /><b>Условия до оплаты</b><p>Пакет, цена и документы доступны до перехода в ЮKassa.</p></article>
        </div>
      </section>

      <section className={styles.faq} id="faq" aria-labelledby="faq-title">
        <div><span>Вопросы</span><h2 id="faq-title">коротко и без обещаний между строк.</h2></div>
        <div className={styles.faqList}>{faq.map(([question, answer], index) => <details key={question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<i aria-hidden="true">+</i></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta}>
        <div><span>Начать спокойно</span><h2>собери маршрут<br />под свою цель.</h2><p>Экзамен, предметы, текущий уровень и удобный ритм. Оплата на первом шаге не нужна.</p></div>
        <Link href="/start">Собрать план <ArrowRight aria-hidden="true" /></Link>
      </section>
    </>
  );
}
