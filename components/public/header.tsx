import { Menu } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

const links = [
  ["#directions", "ЕГЭ и ОГЭ"],
  ["#subjects", "Предметы"],
  ["#format", "Как учимся"],
  ["#plans", "Тарифы"],
  ["#faq", "Вопросы"],
] as const;

export function PublicHeader() {
  return (
    <header className="v2-header">
      <div className="public-container v2-header-inner">
        <Brand />
        <nav className="v2-desktop-nav" aria-label="Главная навигация">
          {links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
        </nav>
        <div className="v2-header-actions">
          <Link className="v2-login-link" href="/login">Войти</Link>
          <Link className="button button-primary v2-header-cta" href="/register">Начать</Link>
          <details className="v2-mobile-menu">
            <summary aria-label="Открыть меню"><Menu aria-hidden="true" /></summary>
            <nav aria-label="Мобильная навигация">
              {links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
              <Link href="/login">Войти в аккаунт</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
