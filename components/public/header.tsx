import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Brand } from "../brand";

export function PublicHeader() {
  return (
    <header className="v9-header">
      <div className="public-container v9-header-inner">
        <Link className="v9-brand-link" href="/" aria-label="Пятёрка — на главную">
          <Brand />
        </Link>
        <nav className="v9-desktop-nav" aria-label="Основная навигация">
          <Link href="#format">Как учимся</Link>
          <Link href="#subjects">Предметы</Link>
          <Link href="#comparison">Сравнение</Link>
          <Link href="#plans">Тарифы</Link>
          <Link href="#faq">Вопросы</Link>
        </nav>
        <div className="v9-header-actions">
          <Link className="v9-login-link" href="/login">Войти</Link>
          <Link className="button button-primary v9-header-cta" href="/register">
            Начать <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <details className="v9-mobile-menu">
          <summary aria-label="Открыть меню"><Menu aria-hidden="true" /></summary>
          <nav aria-label="Мобильная навигация">
            <Link href="#format">Как учимся</Link>
            <Link href="#subjects">Предметы</Link>
            <Link href="#comparison">Сравнение</Link>
            <Link href="#plans">Тарифы</Link>
            <Link href="#faq">Вопросы</Link>
            <Link href="/login">Войти</Link>
            <Link className="button button-primary" href="/register">Начать подготовку</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
