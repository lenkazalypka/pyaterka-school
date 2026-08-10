"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";

export default function DiagnosticError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="diagnostic-page">
      <header className="diagnostic-header"><Brand /></header>
      <section className="diagnostic-card diagnostic-error" role="alert">
        <h1>Не удалось открыть тест</h1>
        <p>Ответы ещё не начались. Попробуйте загрузить страницу снова.</p>
        <div><button className="button button-primary" onClick={reset}>Повторить</button><Link href="/#subjects">К предметам</Link></div>
      </section>
    </main>
  );
}
