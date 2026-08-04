import { Check, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";

export function AuthScreen({ mode, initialName, initialEmail }: { mode: "login" | "register"; initialName?: string; initialEmail?: string }) {
  const login = mode === "login";
  return <main className="auth-layout">
    <section className="auth-main"><div className="auth-form-wrap"><Brand /><span className="auth-kicker"><Sparkles /> Аккаунт «Пятёрки»</span><h1>{login ? "С возвращением" : "Начнём с тебя"}</h1><p>{login ? "Расписание, уроки и ближайший шаг уже ждут." : "После регистрации выберем предметы, цель и удобный ритм подготовки."}</p><AuthForm mode={mode} initialName={initialName} initialEmail={initialEmail} /><p className="auth-switch"><Link href={login ? "/register" : "/login"}>{login ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</Link></p></div></section>
    <aside className="auth-aside"><div className="auth-aside-five" aria-hidden="true">5</div><div className="auth-aside-card"><Target /><b>План под твою цель</b><p>Восемь коротких шагов — и готов понятный маршрут до экзамена.</p><ul><li><Check /> предметы и текущий уровень</li><li><Check /> цели поступления</li><li><Check /> расписание и пакет</li></ul></div></aside>
  </main>;
}
