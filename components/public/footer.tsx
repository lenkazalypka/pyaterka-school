import Link from "next/link";
import { Brand } from "@/components/brand";
import styles from "./redesign-v1.module.css";

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerIntro}><Brand inverse /><p>Рабочее пространство для подготовки к экзамену и следующему этапу жизни.</p></div>
        <nav aria-label="Подготовка"><b>Подготовка</b><a href="#rhythm">Как учимся</a><a href="#subjects">Предметы</a><a href="#plans">Тарифы</a></nav>
        <nav aria-label="Документы"><b>Документы</b><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/consent">Обработка данных</Link><Link href="/legal/offer">Публичная оферта</Link></nav>
        <nav aria-label="Аккаунт"><b>Аккаунт</b><Link href="/login">Войти</Link><Link href="/start">Собрать план</Link></nav>
      </div>
      <div className={styles.footerBottom}><span>© 2026 elio</span><span>Результат экзамена и поступление нельзя гарантировать</span></div>
    </footer>
  );
}
