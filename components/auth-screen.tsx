import { Check, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";

type AuthScreenProps = {
  mode: "login" | "register" | "forgot" | "reset";
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  diagnosticSubject?: string;
  diagnosticSubjectName?: string;
  diagnosticWeakTopics?: string;
  diagnosticScore?: string;
  selectionSummary?: { exam: string; grade: number; subjects: string[]; planName: string; priceLabel: string | null };
};

export function AuthScreen({ mode, initialName, initialEmail, initialPhone, diagnosticSubject, diagnosticSubjectName, diagnosticWeakTopics, diagnosticScore, selectionSummary }: AuthScreenProps) {
  const login = mode === "login";
  const register = mode === "register";
  const title = login ? "С возвращением" : register ? "Начнём с тебя" : mode === "forgot" ? "Восстановим доступ" : "Новый пароль";
  const description = login ? "Расписание, уроки и ближайший шаг уже ждут." : register ? "После регистрации выберем предметы, цель и удобный ритм подготовки." : mode === "forgot" ? "Отправим безопасную ссылку на email, если такой аккаунт есть." : "Придумайте новый пароль длиной не меньше восьми символов.";
  return <main className="auth-layout">
    <section className="auth-main"><div className="auth-form-wrap"><Brand /><span className="auth-kicker"><Sparkles /> Аккаунт elio</span><h1>{title}</h1><p>{description}</p>{register && selectionSummary && <div className="auth-plan-summary"><span>{selectionSummary.exam} · {selectionSummary.grade} класс</span><strong>{selectionSummary.subjects.join(" + ")}</strong><small>{selectionSummary.planName} · {selectionSummary.priceLabel ?? "цена появится до оплаты"}</small><Link href="/start">Изменить выбор</Link></div>}{register && diagnosticSubject && <div className="auth-diagnostic-summary"><strong>Результат сохранён: {diagnosticSubjectName ?? diagnosticSubject}{diagnosticScore ? ` · ${diagnosticScore}` : ""}</strong>{diagnosticWeakTopics && <span>В план добавим темы: {diagnosticWeakTopics}</span>}</div>}<AuthForm mode={mode} initialName={initialName} initialEmail={initialEmail} initialPhone={initialPhone} diagnosticSubject={diagnosticSubject} diagnosticWeakTopics={diagnosticWeakTopics} diagnosticScore={diagnosticScore} /><p className="auth-switch"><Link href={login ? "/start" : "/login"}>{login ? "Нет аккаунта? Собрать план" : register ? "Уже есть аккаунт? Войти" : "Вернуться ко входу"}</Link></p></div></section>
    <aside className="auth-aside"><div className="auth-aside-card"><Target /><b>Маршрут под твою цель</b><p>Восемь коротких шагов — и готов понятный план до экзамена.</p><ul><li><Check /> предметы и текущий уровень</li><li><Check /> цели поступления</li><li><Check /> расписание и пакет</li></ul></div></aside>
  </main>;
}
