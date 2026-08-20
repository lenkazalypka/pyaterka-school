"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import styles from "./redesign-v1.module.css";

const GOALS = [70, 80, 90] as const;

const tutorModel = {
  70: { hours: 24, monthly: 48000 },
  80: { hours: 40, monthly: 80000 },
  90: { hours: 60, monthly: 120000 },
} as const;

const formatRubles = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

export function ScoreComparison() {
  const [goalIndex, setGoalIndex] = useState(1);
  const goal = GOALS[goalIndex];
  const tutor = tutorModel[goal];

  const goalCopy = useMemo(() => {
    if (goal === 70) return "Собираем базу и закрываем самые дорогие пробелы.";
    if (goal === 80) return "Нужна стабильная система: теория, практика и регулярные разборы.";
    return "Высокая цель требует глубокой практики и точечной работы над ошибками.";
  }, [goal]);

  return (
    <section className={styles.comparison} id="compare">
      <div className={styles.container}>
        <div className={styles.comparisonShell}>
          <div className={styles.comparisonIntro}>
            <div>
              <span className={styles.kicker}>Интерактивный расчёт</span>
              <h2>Сколько стоит путь к твоей цели?</h2>
              <p>Двигай ползунок. Мы покажем ориентир по нагрузке и сравним форматы подготовки без магии в цифрах.</p>

              <div className={styles.rangeWrap}>
                <div className={styles.rangeLabels}>
                  {GOALS.map((item) => <strong key={item}>{item}+</strong>)}
                </div>
                <input
                  className={styles.range}
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={goalIndex}
                  onChange={(event) => setGoalIndex(Number(event.target.value))}
                  aria-label="Цель по баллам"
                />
              </div>

              <div className={styles.goalCard} aria-live="polite">
                <small>Цель</small>
                <strong>{goal}+ баллов</strong>
                <p>{goalCopy}</p>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.priceArea}>
              <article className={`${styles.priceCard} ${styles.priceCardPrimary}`}>
                <span className={styles.cardLabel}>elio</span>
                <div className={styles.price}>Тариф подбираем <small>по предметам</small></div>
                <p className={styles.cardCopy}>Не подставляем выдуманную цену до утверждения тарифной сетки.</p>
                <ul className={styles.checks}>
                  <li><Check /> Живые занятия в группе</li>
                  <li><Check /> Записи и материалы</li>
                  <li><Check /> Куратор и контроль прогресса</li>
                  <li><Check /> Пробники и разбор ошибок</li>
                </ul>
              </article>

              <article className={styles.priceCard}>
                <span className={styles.cardLabel}>Репетитор · ориентир</span>
                <div className={styles.price}>≈ {formatRubles(tutor.monthly)} ₽<small>/мес</small></div>
                <p className={styles.cardCopy}>{tutor.hours} ч × 2 000 ₽. Методика расчёта показана прямо здесь, а не спрятана в мелком тексте.</p>
                <ul className={styles.checks}>
                  <li><Check /> Индивидуальные занятия</li>
                  <li><Check /> Цена сильно зависит от преподавателя</li>
                </ul>
              </article>

              <article className={`${styles.priceCard} ${styles.priceCardDark}`}>
                <div className={styles.savings}>
                  <div className={styles.savingsText}>
                    <h3>Сравниваем честно</h3>
                    <p>Экономию покажем только после того, как утвердим реальные тарифы elio. Наша задача — продавать сильным продуктом, а не нарисованной математикой.</p>
                  </div>
                  <strong>{goal}+</strong>
                </div>
              </article>
            </div>
            <p className={styles.disclaimer}>Расчёт репетитора — демонстрационный ориентир по модели «часы × 2 000 ₽». Перед публикацией коммерческого калькулятора источник средней ставки и необходимая нагрузка должны быть подтверждены.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
