import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="state-page">
    <div className="state-page-card">
      <Brand />
      <span className="student-eyebrow">404 · маршрут не найден</span>
      <h1>Этой страницы нет</h1>
      <p>Возможно, ссылка устарела. Вернитесь на главную или откройте свой кабинет.</p>
      <div><Link className="button button-primary" href="/"><ArrowLeft aria-hidden="true" />На главную</Link><Link className="button button-secondary" href="/login">Войти</Link></div>
    </div>
  </main>;
}
