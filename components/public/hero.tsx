import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CirclePlay, TrendingUp } from "lucide-react";

export function PublicHero() {
  return (
    <section className="v2-hero">
      <div className="public-container v2-hero-grid">
        <div className="v2-hero-copy">
          <div className="v2-hero-kicker"><span>ЕГЭ</span><span>ОГЭ</span> Онлайн-школа «Пятёрка»</div>
          <h1>Готовься<br />смелее. <em>На пять.</em></h1>
          <p>Живые занятия, практика и поддержка без учебного хаоса. Всегда понятно, что учить сегодня и куда двигаться дальше.</p>
          <div className="v2-hero-actions">
            <Link className="button button-primary button-large" href="/register">Собрать мой план <ArrowRight aria-hidden="true" /></Link>
            <a className="v2-watch-link" href="#format"><CirclePlay aria-hidden="true" /> Как проходит подготовка</a>
          </div>
          <ul className="v2-hero-points" aria-label="Коротко о школе">
            <li><Check aria-hidden="true" /> 1–4 предмета</li>
            <li><Check aria-hidden="true" /> 2 пробника в месяц</li>
            <li><Check aria-hidden="true" /> Отчёт для родителя</li>
          </ul>
        </div>

        <div className="v2-hero-scene" aria-label="Подготовка к экзаменам с Пятёркой">
          <div className="v2-hero-sun" aria-hidden="true" />
          <Image
            className="v2-hero-student"
            src="/brand/hero-student-v2.png"
            alt="Старшеклассник с тетрадью готовится к экзаменам"
            width={1024}
            height={1536}
            priority
            unoptimized
            sizes="(max-width: 767px) 78vw, (max-width: 1023px) 56vw, 42vw"
          />
          <div className="v2-score-card" aria-label="Фирменный знак результата">
            <small>результат</small><strong>5/5</strong><span><TrendingUp aria-hidden="true" /> шаг за шагом</span>
          </div>
        </div>
      </div>
    </section>
  );
}
