import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "../brand";
import styles from "./redesign-v1.module.css";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Основная навигация">
          <Link href="#platform">Платформа</Link>
          <Link href="#calculator">Маршрут</Link>
          <Link href="#rhythm">Как учимся</Link>
          <Link href="#subjects">Предметы</Link>
          <Link href="#plans">Тарифы</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.loginLink} href="/login">Войти</Link>
          <Link className={styles.headerCta} href="/start">Собрать план <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Открыть меню"><Menu aria-hidden="true" /></summary>
          <nav aria-label="Мобильная навигация">
            <Link href="#platform">Платформа</Link>
            <Link href="#calculator">Маршрут</Link>
            <Link href="#rhythm">Как учимся</Link>
            <Link href="#subjects">Предметы</Link>
            <Link href="#plans">Тарифы</Link>
            <Link href="/login">Войти</Link>
            <Link className={styles.headerCta} href="/start">Собрать план</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
