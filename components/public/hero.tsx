import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3 } from "lucide-react";
import styles from "./redesign-v1.module.css";

export function PublicHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true" /> Подготовка к ЕГЭ и ОГЭ</p>
          <h1 id="hero-title">ты знаешь,<br /><em>что делать дальше.</em></h1>
          <p className={styles.heroLead}>elio собирает занятия, домашние задания, материалы и цели в один спокойный маршрут до экзамена.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/start">Собрать свой план <ArrowRight aria-hidden="true" /></Link>
            <Link className={styles.textButton} href="#platform">Посмотреть платформу</Link>
          </div>
          <ul className={styles.heroFacts}>
            <li><Check aria-hidden="true" /> живые преподаватели</li>
            <li><Check aria-hidden="true" /> от 1 до 4 предметов</li>
            <li><Check aria-hidden="true" /> оплата после выбора плана</li>
          </ul>
        </div>

        <div className={styles.productPreview} aria-label="Пример интерфейса ученика elio">
          <div className={styles.previewTopline}><span>пример интерфейса</span><b>сегодня · ваш часовой пояс</b></div>
          <div className={styles.previewGreeting}><small>добрый вечер, лена</small><strong>Главное на сегодня</strong></div>
          <article className={styles.nextLesson}>
            <div><span>следующее занятие</span><h2>Аргументация в сочинении</h2></div>
            <p><Clock3 aria-hidden="true" /> 18:00–19:30 <i>по вашему времени</i></p>
            <button type="button" disabled>Ссылка появится перед уроком</button>
          </article>
          <div className={styles.previewBottom}>
            <article><CalendarDays aria-hidden="true" /><div><small>расписание</small><b>Ближайшие занятия</b></div></article>
            <article><span aria-hidden="true">→</span><div><small>задачи</small><b>Что нужно сделать</b></div></article>
          </div>
          <div className={styles.routeLine} aria-hidden="true"><span /><i /><i /><i /></div>
        </div>
      </div>
    </section>
  );
}
