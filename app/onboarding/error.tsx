"use client";

import { Brand } from "@/components/brand";

export default function OnboardingError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="grid min-h-screen place-items-center px-4"><section className="card max-w-lg p-8"><Brand/><h1 className="mt-8 text-3xl font-extrabold">Не удалось загрузить шаг</h1><p className="mt-3 text-[var(--text-muted)]">Сохранённые ранее данные не потеряны. Попробуйте загрузить страницу ещё раз.</p><button onClick={reset} className="mt-6 h-12 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-white">Повторить</button></section></main>}
