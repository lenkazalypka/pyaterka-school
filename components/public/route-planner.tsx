"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Check, Route } from "lucide-react";
import Link from "next/link";
import { saveRouteLead, type RouteLeadState } from "@/app/public-actions";
import { diagnosticSubjects, diagnosticSubjectSlugs, type DiagnosticSubjectSlug } from "@/lib/diagnostic-tests";
import styles from "./redesign-v1.module.css";

const initialState: RouteLeadState = { error: null };

export function RoutePlanner({ enabled }: { enabled: boolean }) {
  const [grade, setGrade] = useState(11);
  const [goal, setGoal] = useState<"ege" | "oge" | "grade">("ege");
  const [subjects, setSubjects] = useState<DiagnosticSubjectSlug[]>(["russian"]);
  const [state, action, pending] = useActionState(saveRouteLead, initialState);
  const durationMonths = grade === 8 || grade === 10 ? 20 : 10;
  const subjectWord = subjects.length === 1 ? "предмет" : "предмета";
  const subjectNames = useMemo(() => subjects.map((subject) => diagnosticSubjects[subject].name), [subjects]);

  function changeGrade(value: number) {
    setGrade(value);
    if (value <= 9 && goal === "ege") setGoal("oge");
    if (value >= 10 && goal === "oge") setGoal("ege");
  }

  function toggleSubject(subject: DiagnosticSubjectSlug) {
    setSubjects((current) => current.includes(subject)
      ? current.length === 1 ? current : current.filter((item) => item !== subject)
      : current.length < 4 ? [...current, subject] : current);
  }

  return <section className={styles.planner} id="calculator" aria-labelledby="calculator-title">
    <div className={styles.plannerIntro}><span>Персональный маршрут</span><h2 id="calculator-title">сколько подготовки<br />нужно именно тебе.</h2><p>Сначала собираем структуру. Стоимость не вычисляется на глаз: она появится из активного тарифа Supabase после выбора пакета.</p></div>
    <div className={styles.plannerWorkspace}>
      <div className={styles.plannerControls}>
        <fieldset><legend>Класс</legend><div>{[8, 9, 10, 11].map((value) => <button type="button" aria-pressed={grade === value} onClick={() => changeGrade(value)} key={value}>{value}</button>)}</div></fieldset>
        <fieldset><legend>Цель</legend><div>{([grade <= 9 ? "oge" : "ege", "grade"] as const).map((value) => <button type="button" aria-pressed={goal === value} onClick={() => setGoal(value)} key={value}>{value === "grade" ? "Повысить оценку" : value.toUpperCase()}</button>)}</div></fieldset>
        <fieldset><legend>Предметы <small>{subjects.length} / 4</small></legend><div className={styles.plannerSubjects}>{diagnosticSubjectSlugs.map((subject) => <button type="button" aria-pressed={subjects.includes(subject)} onClick={() => toggleSubject(subject)} key={subject}>{subjects.includes(subject) && <Check aria-hidden="true" />}{diagnosticSubjects[subject].name}</button>)}</div></fieldset>
      </div>
      <aside className={styles.plannerResult}>
        <Route aria-hidden="true" /><span>Твой маршрут</span><h3>{subjects.length} {subjectWord}</h3><p>{goal === "grade" ? "Повышение оценки" : goal.toUpperCase()} · {grade} класс</p><dl><div><dt>Ориентир</dt><dd>{durationMonths} учебных месяцев</dd></div><div><dt>Комбинация</dt><dd>{subjectNames.join(" · ")}</dd></div><div><dt>Подход</dt><dd>персональный план</dd></div></dl>
        <p className="sr-only" aria-live="polite">Маршрут: {subjects.length} {subjectWord}, {goal === "grade" ? "повышение оценки" : goal.toUpperCase()}, {grade} класс, ориентир {durationMonths} учебных месяцев.</p>
        <form action={action} className={styles.leadForm}>
          <input type="hidden" name="grade" value={grade} /><input type="hidden" name="goal" value={goal} /><input type="hidden" name="subjectCodes" value={subjects.join(",")} />
          <label>Имя<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label>Телефон или email<input name="contact" required maxLength={254} autoComplete="email" /></label>
          <label className={styles.leadConsent}><input name="consent" type="checkbox" required disabled={!enabled} /><span>Согласен на <Link href="/legal/consent">обработку данных</Link> для связи по этому маршруту</span></label>
          <button type="submit" disabled={pending || !enabled}>{pending ? "Сохраняем…" : enabled ? <>Сохранить маршрут <ArrowRight aria-hidden="true" /></> : "Приём заявок пока закрыт"}</button>
          {!enabled && <p role="status" className={styles.formNotice}>Расчёт работает без отправки данных. Сохранение откроется после утверждения юридических документов.</p>}
          {state.error && <p role="alert" className={styles.formError}>{state.error}</p>}
          {state.success && <p role="status" className={styles.formSuccess}>{state.success}</p>}
        </form>
      </aside>
    </div>
  </section>;
}
