"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center px-6">
    <section className="card max-w-lg p-8">
      <h1 className="text-3xl font-extrabold">Что-то пошло не так</h1>
      <p className="mt-3 text-[var(--text-muted)]">Мы не смогли выполнить запрос. Попробуйте ещё раз; если ошибка повторится, сообщите поддержке.</p>
      <button className="button button-primary mt-6" onClick={reset}>Повторить</button>
    </section>
  </main>;
}
