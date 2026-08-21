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
import styles from "./redesign-v1.module.css";

const rhythm = [
  ["01", "Сегодня", "Кабинет выбирает одно главное действие и отделяет его от справочной информации."],
  ["02", "Урок", "Живое занятие связывает новую тему с экзаменационным заданием."],
  ["03", "Практика", "Задания показывают конкретный пробел, а не абстрактный процент прогресса."],
  ["04", "Домашка", "Ответ, материалы и дедлайн остаются рядом с уроком."],
  ["05", "Разбор ошибок", "Проверенный результат уточняет слабые темы и рекомендации."],
  ["06", "Следующий шаг", "Маршрут обновляется по реальным действиям и возвращает к фокусу."],
] as const;

const faq = [
  ["Можно готовиться по нескольким предметам?", "Да. Можно выбрать от одного до четырёх предметов. Точный лимит зависит от пакета и виден до оплаты."],
  ["Что будет, если пропустить занятие?", "После публикации запись и материалы останутся внутри урока. Доступ определяется активной подпиской на предмет."],
  ["Что видит родитель?", "Только подтверждённые учебные данные ребёнка. Личная переписка ученика не открывается автоматически."],
  ["Когда нужно оплачивать?", "Сначала можно выбрать экзамен, предметы, цель и пакет. Доступ активируется только после подтверждения оплаты платёжным сервисом."],
  ["Вы гарантируете нужный балл?", "Нет. elio помогает выстроить подготовку и видеть следующий шаг, но результат зависит от многих факторов, включая работу самого ученика."],
] as const;

const workspaceParts = ["Занятия", "Домашка", "Материалы", "Прогресс", "AI-помощник"] as const;

export function PublicSections() {
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
        <div className={styles.workspaceTrust}><div><small>Один кабинет</small><strong>вместо пяти сервисов</strong></div><ul>{workspaceParts.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></div>
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
          <p>Диагностика помогает определить стартовый уровень и не обещает результат. Персональный прогресс появляется только после реальных уроков; публичный preview явно отмечен как демонстрация интерфейса.</p>
        </div>
        <div className={styles.subjectGrid}>
          {diagnosticSubjectSlugs.map((slug, index) => {
            const subject = diagnosticSubjects[slug];
            return <article key={slug}><span>{String(index + 1).padStart(2, "0")}</span><SubjectIcon subject={slug} /><h3>{subject.name}</h3><div><Link href={`/test/${subject.slug}`}>Диагностика</Link><Link href={`/start?subject=${slug}`} aria-label={`Выбрать ${subject.name}`}><ArrowRight aria-hidden="true" /></Link></div></article>;
          })}
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
