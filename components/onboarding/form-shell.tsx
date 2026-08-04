"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import type { OnboardingActionState } from "@/app/onboarding/actions";

type Action = (state: OnboardingActionState, formData: FormData) => Promise<OnboardingActionState>;

export const fieldClass = "mt-2 h-12 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 text-[var(--text-primary)] disabled:bg-black/5";
export const textareaClass = "mt-2 min-h-24 w-full rounded-xl border border-[var(--border-soft)] bg-white p-4 text-[var(--text-primary)]";

export function FieldError({ state, name }: { state: OnboardingActionState; name: string }) {
  const error = state.fieldErrors?.[name]?.[0];
  return error ? <span className="mt-1 block text-sm text-[var(--brand-primary)]">{error}</span> : null;
}

export function FormShell({ action, children, submitLabel = "Сохранить и продолжить", hidden }: { action: Action; children: ReactNode; submitLabel?: string; hidden?: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, { error: null } satisfies OnboardingActionState);
  const [dirty, setDirty] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const intercept = (event: MouseEvent) => {
      if (!dirty || !(event.target instanceof Element)) return;
      const anchor = event.target.closest("a");
      if (!anchor || anchor.target === "_blank" || new URL(anchor.href).origin !== window.location.origin) return;
      event.preventDefault();
      setLeaveHref(anchor.href);
    };
    window.addEventListener("beforeunload", prevent);
    document.addEventListener("click", intercept, true);
    return () => { window.removeEventListener("beforeunload", prevent); document.removeEventListener("click", intercept, true); };
  }, [dirty]);
  return <form action={formAction} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)} className="mt-7 space-y-6">
    {hidden}
    {children}
    {state.error && <div role="alert" className="rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--surface-rose)] px-4 py-3 text-sm text-[var(--brand-primary)]">{state.error}</div>}
    <button disabled={pending} className="onboarding-submit w-full sm:w-auto">
      {pending ? "Сохраняем…" : submitLabel}
    </button>
    {leaveHref&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div className="card max-w-md p-6"><h2 id="leave-title" className="text-xl font-extrabold">Есть несохранённые изменения</h2><p className="mt-2 text-sm text-[var(--text-muted)]">Если уйти сейчас, изменения на этом шаге не сохранятся.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" autoFocus onClick={()=>setLeaveHref(null)} className="h-11 rounded-xl bg-[var(--brand-primary)] px-4 font-bold text-white">Остаться</button><button type="button" onClick={()=>{setDirty(false);window.location.assign(leaveHref);}} className="h-11 rounded-xl border border-[var(--border-soft)] px-4 font-bold">Уйти без сохранения</button></div></div></div>}
  </form>;
}
