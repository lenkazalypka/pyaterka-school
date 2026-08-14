import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import styles from "./redesign-v1.module.css";

export function PublicHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            ЕГЭ и ОГЭ · подготовка с людьми, а не вместо людей
          </div>

          <h1 className={styles.title} id="hero-title">
            Экзамен без хаоса.<br />
            <span className={styles.titleAccent}>У тебя есть план.</span>
          </h1>

          <p className={styles.lead}>
            Живые преподаватели, своя группа, куратор и платформа, которая каждый день
            показывает главное: что делать дальше, чтобы дойти до своей цели.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/start">
              Собрать мой план <ArrowRight aria-hidden="true" />
            </Link>
            <a className={styles.secondaryButton} href="#compare">
              <Play aria-hidden="true" /> Посмотреть, как это работает
            </a>
          </div>

          <ul className={styles.microProof} aria-label="Что входит в подготовку">
            <li><Check aria-hidden="true" /> живые занятия</li>
            <li><Check aria-hidden="true" /> записи автоматически</li>
            <li><Check aria-hidden="true" /> человек-куратор</li>
            <li><Check aria-hidden="true" /> понятный прогресс</li>
          </ul>
        </div>

        <div className={styles.visual} aria-label="Пример интерфейса Пятёрки">
          <div className={styles.five} aria-hidden="true">5</div>
          <div className={`${styles.floatCard} ${styles.floatTop}`}>
            <small>Сегодня · 18:00</small>
            <strong>Профильная математика →</strong>
          </div>
          <div className={`${styles.floatCard} ${styles.floatLime}`}>
            <small>ДЗ проверено</small>
            <strong>8 / 10 · есть разбор</strong>
          </div>
          <div className={`${styles.floatCard} ${styles.floatBottom}`}>
            <small>Твоя динамика</small>
            <strong>62 → 71 · +9 баллов</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
