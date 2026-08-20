"use client";

export default function ParentError({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center px-4"><section className="card max-w-xl p-7" role="alert"><h1 className="text-2xl font-extrabold">Не удалось загрузить прогресс</h1><p className="mt-3 text-[var(--text-muted)]">Данные не заменены демонстрационными. Попробуйте повторить запрос.</p><button className="button button-primary mt-5" onClick={reset}>Повторить</button></section></main>;
}
