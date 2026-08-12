"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, register, requestPasswordReset, updatePassword, type State } from "@/app/actions";

type AuthFormProps = {
  mode: "login" | "register" | "forgot" | "reset";
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  diagnosticSubject?: string;
  diagnosticWeakTopics?: string;
  diagnosticScore?: string;
};

export function AuthForm({ mode, initialName = "", initialEmail = "", initialPhone = "", diagnosticSubject, diagnosticWeakTopics, diagnosticScore }: AuthFormProps) {
  const handler = mode === "login" ? login : mode === "register" ? register : mode === "forgot" ? requestPasswordReset : updatePassword;
  const [state, action, pending] = useActionState(handler, { error: null } satisfies State);
  return <form action={action} className="mt-8 space-y-4">
    {mode === "register" && <label className="form-label">Имя<input className="form-input" name="name" defaultValue={initialName} autoComplete="given-name" minLength={2} required placeholder="Как к вам обращаться" /></label>}
    {mode !== "reset" && <label className="form-label">Email<input className="form-input" name="email" type="email" defaultValue={initialEmail} autoComplete="email" required placeholder="you@example.ru" /></label>}
    {mode === "register" && diagnosticSubject && <label className="form-label">Телефон <span className="form-optional">необязательно</span><input className="form-input" name="phone" type="tel" defaultValue={initialPhone} autoComplete="tel" maxLength={30} placeholder="+7 900 000-00-00" /></label>}
    {mode === "register" && diagnosticSubject && <input name="diagnostic" type="hidden" value={diagnosticSubject} />}
    {mode === "register" && diagnosticWeakTopics && <input name="weak" type="hidden" value={diagnosticWeakTopics} />}
    {mode === "register" && diagnosticScore && <input name="diagnosticScore" type="hidden" value={diagnosticScore} />}
    {mode !== "forgot" && <label className="form-label">{mode === "reset" ? "Новый пароль" : "Пароль"}<input className="form-input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required placeholder="Минимум 8 символов" /></label>}
    {mode === "login" && <p className="text-right text-sm"><Link href="/forgot-password">Забыли пароль?</Link></p>}
    {mode === "register" && <label className="checkbox-label"><input name="consent" type="checkbox" required /><span>Согласен(а) на <a href="/legal/consent" target="_blank">обработку персональных данных</a></span></label>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="rounded-xl bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-burgundy)]" role="status">{state.success}</p>}
    <button disabled={pending} className="button button-primary button-large w-full">{pending ? "Сохраняем…" : mode === "login" ? "Войти" : mode === "register" ? "Создать аккаунт" : mode === "forgot" ? "Отправить ссылку" : "Сохранить пароль"}</button>
  </form>;
}
