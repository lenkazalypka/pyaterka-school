import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicFooter() {
  return (
    <footer className="v2-footer">
      <div className="public-container v2-footer-grid">
        <div className="v2-footer-brand"><Brand inverse /><p>Подготовка к ЕГЭ и ОГЭ, в которой понятен следующий шаг.</p></div>
        <div><b>Подготовка</b><a href="#directions">ЕГЭ и ОГЭ</a><a href="#subjects">Предметы</a><a href="#plans">Тарифы</a></div>
        <div><b>Документы</b><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/consent">Обработка данных</Link><Link href="/legal/offer">Публичная оферта</Link></div>
        <div><b>Аккаунт</b><Link href="/login">Войти</Link><Link href="/register">Регистрация</Link></div>
      </div>
      <div className="public-container v2-footer-bottom"><span>© 2026 «Пятёрка»</span><span>Результат экзамена и поступление нельзя гарантировать</span></div>
    </footer>
  );
}

