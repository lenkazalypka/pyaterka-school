import { Check, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";

type AuthScreenProps = {
  mode: "login" | "register";
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  diagnosticSubject?: string;
  diagnosticSubjectName?: string;
  diagnosticWeakTopics?: string;
  diagnosticScore?: string;
};

export function AuthScreen({ mode, initialName, initialEmail, initialPhone, diagnosticSubject, diagnosticSubjectName, diagnosticWeakTopics, diagnosticScore }: AuthScreenProps) {
  const login = mode === "login";
  return <main className="auth-layout">
    <section className="auth-main"><div className="auth-form-wrap"><Brand /><span className="auth-kicker"><Sparkles /> Аккаунт «Пятёрки»</span><h1>{login ? "С возвращением" : "Начнём с тебя"}</h1><p>{login ? "Расписание, уроки и ближайший шаг уже ждут." : "После регистрации выберем предметы, цель и удобный ритм подготовки."}</p>{!login && diagnosticSubject && <div className="auth-diagnostic-summary"><strong>Результат сохранён: {diagnosticSubjectName ?? diagnosticSubject}{diagnosticScore ? ` · ${diagnosticScore}` : ""}</strong>{diagnosticWeakTopics && <span>В план добавим темы: {diagnosticWeakTopics}</span>}</div>}<AuthForm mode={mode} initialName={initialName} initialEmail={initialEmail} initialPhone={initialPhone} diagnosticSubject={diagnosticSubject} diagnosticWeakTopics={diagnosticWeakTopics} diagnosticScore={diagnosticScore} /><p className="auth-switch"><Link href={login ? "/register" : "/login"}>{login ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</Link></p></div></section>
    <aside className="auth-aside"><div className="auth-aside-five" aria-hidden="true">5</div><div className="auth-aside-card"><Target /><b>План под твою цель</b><p>Восемь коротких шагов — и готов понятный маршрут до экзамена.</p><ul><li><Check /> предметы и текущий уровень</li><li><Check /> цели поступления</li><li><Check /> расписание и пакет</li></ul></div></aside>
  </main>;
}
