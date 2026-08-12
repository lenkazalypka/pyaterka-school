"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function StudentError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main className="grid min-h-screen place-items-center px-6"><div className="card max-w-xl p-8"><p className="student-eyebrow">Не удалось загрузить кабинет</p><h1 className="mt-3 text-3xl font-extrabold">Данные временно недоступны</h1><p className="mt-3 text-[var(--text-muted)]">Мы не подставляем старые или случайные показатели. Попробуйте загрузить данные ещё раз.</p><button className="button button-primary mt-6" onClick={reset}>Повторить</button></div></main>;
}
