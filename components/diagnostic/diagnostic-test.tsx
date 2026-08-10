"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import type { DiagnosticSubject } from "@/lib/diagnostic-tests";

type Props = { subject: DiagnosticSubject };

function resultTitle(correct: number, total: number) {
  const share = correct / total;
  if (share === 1) return "Сильный старт";
  if (share >= 0.7) return "Уверенная база";
  if (share >= 0.5) return "База уже есть";
  return "Начнём с фундамента";
}

export function DiagnosticTest({ subject }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [complete, setComplete] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const question = subject.questions[questionIndex];
  const correctCount = answers.reduce((total, answer, index) => (
    total + (answer === subject.questions[index]?.correctIndex ? 1 : 0)
  ), 0);
  const weakTopics = useMemo(() => subject.questions
    .filter((item, index) => answers[index] !== item.correctIndex)
    .map((item) => item.topic)
    .filter((topic, index, all) => all.indexOf(topic) === index), [answers, subject.questions]);

  useEffect(() => {
    if (!complete) return;
    try {
      localStorage.setItem("pyaterka:diagnostic", JSON.stringify({
        subject: subject.slug,
        score: correctCount,
        total: subject.questions.length,
        weakTopics,
        completedAt: new Date().toISOString(),
      }));
    } catch {
      // Результат остаётся на экране, даже если браузер запрещает локальное хранилище.
    }
  }, [complete, correctCount, subject.questions.length, subject.slug, weakTopics]);

  if (!question || subject.questions.length === 0) {
    return (
      <section className="diagnostic-card diagnostic-error" role="alert">
        <h1>Тест пока не загрузился</h1>
        <p>Вернитесь к предметам и попробуйте ещё раз.</p>
        <Link className="button button-primary" href="/#subjects">К предметам</Link>
      </section>
    );
  }

  function chooseAnswer(index: number) {
    if (showFeedback) return;
    setSelectedIndex(index);
    setShowFeedback(true);
    setAnswers((current) => [...current, index]);
  }

  function nextQuestion() {
    if (questionIndex === subject.questions.length - 1) {
      setComplete(true);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedIndex(null);
    setShowFeedback(false);
  }

  function restart() {
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedIndex(null);
    setShowFeedback(false);
    setComplete(false);
    setEmail("");
    setPhone("");
  }

  if (complete) {
    const params = new URLSearchParams({
      subject: subject.name,
      diagnostic: subject.slug,
      score: `${correctCount}/${subject.questions.length}`,
    });
    if (weakTopics.length) params.set("weak", weakTopics.join(", "));
    if (email.trim()) params.set("email", email.trim());
    if (phone.trim()) params.set("phone", phone.trim());

    return (
      <section className="diagnostic-card diagnostic-result" aria-labelledby="diagnostic-result-title">
        <span className="diagnostic-kicker">Результат · {subject.name}</span>
        <div className="diagnostic-score" aria-label={`${correctCount} правильных ответов из ${subject.questions.length}`}>
          <strong>{correctCount}/{subject.questions.length}</strong>
          <span>{resultTitle(correctCount, subject.questions.length)}</span>
        </div>
        <h1 id="diagnostic-result-title">Теперь понятнее,<br /><em>с чего начать.</em></h1>
        <div className="diagnostic-summary">
          <div>
            <h2>Темы для внимания</h2>
            {weakTopics.length ? (
              <ul>{weakTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            ) : (
              <p>В короткой диагностике слабых тем не выявлено. Следующий шаг — проверить устойчивость на полном пробнике.</p>
            )}
          </div>
          <div>
            <h2>Что делать дальше</h2>
            <p>{weakTopics.length
              ? `Начните с тем «${weakTopics.slice(0, 2).join("» и «")}», затем закрепите их задачами экзаменационного формата.`
              : "Переходите к заданиям повышенной сложности и тренируйте темп на вариантах целиком."}</p>
          </div>
        </div>
        <div className="diagnostic-contact">
          <div>
            <h2>Перенести результат в план</h2>
            <p>Контакты необязательны. Если заполните их, они уже будут в форме регистрации.</p>
          </div>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value.slice(0, 254))} autoComplete="email" placeholder="you@example.ru" /></label>
          <label>Телефон<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value.slice(0, 30))} autoComplete="tel" placeholder="+7 900 000-00-00" /></label>
        </div>
        <div className="diagnostic-result-actions">
          <Link className="button button-primary button-large" href={`/register?${params.toString()}`}>Собрать план подготовки <ArrowRight aria-hidden="true" /></Link>
          <button className="diagnostic-restart" type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Пройти ещё раз</button>
        </div>
      </section>
    );
  }

  const progress = ((questionIndex + 1) / subject.questions.length) * 100;
  const selectedIsCorrect = selectedIndex === question.correctIndex;

  return (
    <section className="diagnostic-card" aria-labelledby="diagnostic-question-title">
      <div className="diagnostic-topline">
        <Link href="/#subjects"><ArrowLeft aria-hidden="true" /> Все предметы</Link>
        <span>{subject.name}</span>
      </div>
      <div className="diagnostic-progress-copy">
        <strong>Вопрос {questionIndex + 1} из {subject.questions.length}</strong>
        <span>{question.level} · {question.topic}</span>
      </div>
      <div className="diagnostic-progress" role="progressbar" aria-label="Прогресс теста" aria-valuemin={1} aria-valuemax={subject.questions.length} aria-valuenow={questionIndex + 1}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <h1 id="diagnostic-question-title">{question.prompt}</h1>
      <div className="diagnostic-options" role="group" aria-label="Варианты ответа">
        {question.options.map((option, index) => {
          const chosen = selectedIndex === index;
          const correct = showFeedback && index === question.correctIndex;
          const wrong = showFeedback && chosen && !correct;
          return (
            <button
              className={`${chosen ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}
              disabled={showFeedback}
              type="button"
              onClick={() => chooseAnswer(index)}
              key={option}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              <strong>{option}</strong>
              {correct && <Check aria-hidden="true" />}
              {wrong && <X aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className={`diagnostic-feedback ${showFeedback ? "is-visible" : ""} ${selectedIsCorrect ? "is-correct" : "is-wrong"}`} aria-live="polite">
        {showFeedback && (
          <>
            <div><strong>{selectedIsCorrect ? "Верно" : "Пока нет"}</strong><p>{question.explanation}</p></div>
            <button className="button button-primary" type="button" onClick={nextQuestion}>
              {questionIndex === subject.questions.length - 1 ? "Узнать результат" : "Следующий вопрос"} <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
