"use client";

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center px-6"><div className="card max-w-xl p-8"><p className="student-eyebrow">AI-наставник</p><h1 className="mt-3 text-3xl font-extrabold">Диалог не загрузился</h1><p className="mt-3 text-[var(--text-muted)]">Учебные данные не заменяются заглушкой. Попробуйте обновить раздел.</p><button className="button button-primary mt-6" onClick={reset}>Повторить</button></div></main>;
}
