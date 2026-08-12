"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="ru"><body><main className="grid min-h-screen place-items-center px-6"><section className="card max-w-lg p-8"><h1 className="text-3xl font-extrabold">Сервис временно недоступен</h1><p className="mt-3 text-[var(--text-muted)]">Ошибка уже отправлена команде. Попробуйте ещё раз.</p><button className="button button-primary mt-6" onClick={reset}>Повторить</button></section></main></body></html>;
}
