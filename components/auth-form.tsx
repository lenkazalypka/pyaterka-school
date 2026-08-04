"use client";
import { useActionState } from "react";
import { login, register, type State } from "@/app/actions";

export function AuthForm({ mode, initialName = "", initialEmail = "" }: { mode: "login" | "register"; initialName?: string; initialEmail?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, { error: null } satisfies State);
  return <form action={action} className="mt-8 space-y-4">
    {mode === "register" && <label className="form-label">Имя<input className="form-input" name="name" defaultValue={initialName} autoComplete="given-name" minLength={2} required placeholder="Как к вам обращаться" /></label>}
    <label className="form-label">Email<input className="form-input" name="email" type="email" defaultValue={initialEmail} autoComplete="email" required placeholder="you@example.ru" /></label>
    <label className="form-label">Пароль<input className="form-input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required placeholder="Минимум 8 символов" /></label>
    {mode === "register" && <label className="checkbox-label"><input name="consent" type="checkbox" required /><span>Согласен(а) на <a href="/legal/consent" target="_blank">обработку персональных данных</a></span></label>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button disabled={pending} className="button button-primary button-large w-full">{pending ? "Сохраняем…" : mode === "login" ? "Войти" : "Создать аккаунт"}</button>
  </form>;
}
