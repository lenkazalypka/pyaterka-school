import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Play, Sparkles } from "lucide-react";
import { HeroMarkerNote } from "@/components/illustrations/brand-graphics";

export function PublicHero() {
  const heroVideoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim();

  return (
    <section className="v9-hero" aria-labelledby="hero-title">
      <div className="public-container v9-hero-grid">
        <div className="v9-hero-copy" data-reveal>
          <div className="v9-eyebrow"><Sparkles aria-hidden="true" /> ЕГЭ и ОГЭ без хаоса</div>
          <h1 id="hero-title">Сложный экзамен.<br /><em>Понятный план.</em></h1>
          <p className="v9-hero-lead">
            За первый месяц ты войдёшь в ритм: живые занятия, практика, разбор ошибок
            и ясное понимание, что делать дальше.
          </p>
          <ul className="v9-hero-points" aria-label="Что входит в подготовку">
            <li><Check aria-hidden="true" /> От 1 до 4 предметов в одном кабинете</li>
            <li><Check aria-hidden="true" /> Записи, материалы и дедлайны всегда под рукой</li>
            <li><Check aria-hidden="true" /> Прогресс виден ученику и родителю</li>
          </ul>
          <div className="v9-hero-actions">
            <Link className="button button-primary button-large" href="/start">
              Собрать свой план <ArrowRight aria-hidden="true" />
            </Link>
            <a className="v9-text-link" href="#format"><Play aria-hidden="true" /> Посмотреть, как всё устроено</a>
          </div>
          <p className="v9-hero-note">Без оплаты на первом шаге. Сначала выбираешь цель и предметы.</p>
        </div>

        <div className="v9-hero-media" data-reveal>
          <div className="v9-hero-image-wrap">
            {heroVideoUrl ? (
              <video
                className="v9-hero-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/brand/hero-study-illustration-v3.webp"
                aria-label="Фрагмент онлайн-занятия в Пятёрке"
              >
                <source src={heroVideoUrl} />
              </video>
            ) : (
              <Image
                src="/brand/hero-study-illustration-v3.webp"
                alt="Старшеклассник готовится к экзаменам за рабочим столом"
                fill
                priority
                unoptimized
                sizes="(max-width: 1023px) 100vw, 48vw"
              />
            )}
            <div className="v9-media-overlay" aria-hidden="true" />
            <HeroMarkerNote />
            <div className="v9-media-caption"><span>01</span><p><small>живой урок</small><strong>вопрос → разбор → практика</strong></p></div>
          </div>
          <div className="v9-hero-edition" aria-hidden="true"><span>ПЯТЁРКА / 2026</span><b>экзамен — это маршрут</b></div>
        </div>
      </div>
    </section>
  );
}
