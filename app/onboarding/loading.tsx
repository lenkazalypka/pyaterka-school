import { Brand } from "@/components/brand";

export default function OnboardingLoading(){return <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"><div className="mx-auto max-w-4xl"><Brand/><div className="card mt-6 animate-pulse p-6 sm:p-10" aria-busy="true" aria-label="Загрузка шага"><div className="h-4 w-28 rounded bg-black/10"/><div className="mt-4 h-10 w-2/3 rounded bg-black/10"/><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-24 rounded-xl bg-black/10"/><div className="h-24 rounded-xl bg-black/10"/><div className="h-24 rounded-xl bg-black/10"/><div className="h-24 rounded-xl bg-black/10"/></div></div></div></main>}

