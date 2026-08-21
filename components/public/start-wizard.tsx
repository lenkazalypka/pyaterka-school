"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, LockKeyhole, Sparkles } from "lucide-react";
import { SubjectIcon } from "@/components/icons/subject-icons";
import { diagnosticSubjects, diagnosticSubjectSlugs, isDiagnosticSubjectSlug, type DiagnosticSubjectSlug } from "@/lib/diagnostic-tests";
import type { PublicPlan } from "@/lib/public-site";

type Exam = "ege" | "oge";
type Step = 1 | 2 | 3 | 4;

const steps = [
  ["01", "Экзамен"],
  ["02", "Предметы"],
  ["03", "Тариф"],
  ["04", "Аккаунт"],
] as const;

function parseExam(value?: string): Exam {
  return value === "oge" ? "oge" : "ege";
}

function gradeFor(exam: Exam, value?: string) {
  const parsed = Number(value);
  const allowed = exam === "ege" ? [10, 11] : [8, 9];
  return allowed.includes(parsed) ? parsed : exam === "ege" ? 11 : 9;
}

export function StartWizard({ plans, initialExam, initialGrade, initialSubject, initialPlan }: {
  plans: PublicPlan[];
  initialExam?: string;
  initialGrade?: string;
  initialSubject?: string;
  initialPlan?: string;
}) {
  const parsedExam = parseExam(initialExam);
  const parsedSubject = isDiagnosticSubjectSlug(initialSubject ?? "") ? initialSubject as DiagnosticSubjectSlug : undefined;
  const [step, setStep] = useState<Step>(1);
  const [exam, setExam] = useState<Exam>(parsedExam);
  const [grade, setGrade] = useState(() => gradeFor(parsedExam, initialGrade));
  const [subjects, setSubjects] = useState<DiagnosticSubjectSlug[]>(parsedSubject ? [parsedSubject] : []);
  const [planCode, setPlanCode] = useState(() => plans.some((plan) => plan.code === initialPlan) ? initialPlan ?? "" : "");

  const selectedPlan = plans.find((plan) => plan.code === planCode);
  const selectedPriceMinor = selectedPlan?.pricesMinor[subjects.length];
  const selectedPriceLabel = selectedPlan && selectedPriceMinor
    ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: selectedPlan.currency, maximumFractionDigits: 0 }).format(selectedPriceMinor / 100) + " / месяц"
    : null;
  const selectedSubjectNames = subjects.map((slug) => diagnosticSubjects[slug].name);
  const registrationHref = useMemo(() => {
    const query = new URLSearchParams({ exam, grade: String(grade), subjects: subjects.join(","), plan: planCode });
    if (selectedSubjectNames[0]) query.set("subject", selectedSubjectNames[0]);
    return `/register?${query.toString()}`;
  }, [exam, grade, planCode, selectedSubjectNames, subjects]);

  const chooseExam = (value: Exam) => {
    setExam(value);
    setGrade(value === "ege" ? 11 : 9);
  };
  const toggleSubject = (slug: DiagnosticSubjectSlug) => {
    setSubjects((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length < 4 ? [...current, slug] : current);
    setPlanCode("");
  };
  const continueForward = () => {
    if (step === 2 && subjects.length === 0) return;
    if (step === 3 && !selectedPlan) return;
    setStep((current) => Math.min(4, current + 1) as Step);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const goBack = () => {
    setStep((current) => Math.max(1, current - 1) as Step);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="public-container start-shell">
      <ol className="start-progress" aria-label="Шаги выбора плана">
        {steps.map(([number, label], index) => {
          const value = (index + 1) as Step;
          return <li className={step === value ? "is-current" : step > value ? "is-complete" : ""} key={number} aria-current={step === value ? "step" : undefined}>
            <button type="button" onClick={() => step > value && setStep(value)} disabled={step < value}>
              <span>{step > value ? <Check aria-hidden="true" /> : number}</span><b>{label}</b>
            </button>
          </li>;
        })}
      </ol>

      <section className="start-stage" aria-live="polite">
        {step === 1 && <>
          <div className="start-stage-heading"><span>Шаг 1 из 4</span><h1>Какой экзамен<br /> <em>ты сдаёшь?</em></h1><p>Выбор нужен, чтобы дальше показать подходящий маршрут. Его можно будет уточнить в кабинете.</p></div>
          <div className="start-exam-grid">
            {(["ege", "oge"] as const).map((value) => <button className={exam === value ? "is-selected" : ""} type="button" aria-pressed={exam === value} onClick={() => chooseExam(value)} key={value}>
              <span>{value === "ege" ? "11" : "9"}</span><small>класс</small><strong>{value.toUpperCase()}</strong><p>{value === "ege" ? "Маршрут к баллам для поступления" : "Маршрут к уверенной итоговой оценке"}</p><i><Check aria-hidden="true" /></i>
            </button>)}
          </div>
          <fieldset className="start-grade"><legend>В каком ты сейчас классе?</legend><div>{(exam === "ege" ? [10, 11] : [8, 9]).map((value) => <button type="button" aria-pressed={grade === value} className={grade === value ? "is-selected" : ""} onClick={() => setGrade(value)} key={value}>{value} класс</button>)}</div></fieldset>
        </>}

        {step === 2 && <>
          <div className="start-stage-heading"><span>Шаг 2 из 4</span><h1>Собери свою<br /><em>комбинацию.</em></h1><p>Выбери от одного до четырёх предметов. От количества зависит доступность тарифов.</p></div>
          <div className="start-selection-counter"><strong>{subjects.length} / 4</strong><span>{subjects.length ? "предметов выбрано" : "выбери первый предмет"}</span></div>
          <div className="start-subject-grid">
            {diagnosticSubjectSlugs.map((slug) => {
              const subject = diagnosticSubjects[slug];
              const selected = subjects.includes(slug);
              const disabled = !selected && subjects.length >= 4;
              return <button className={`tone-${subject.tone} ${selected ? "is-selected" : ""}`} type="button" aria-pressed={selected} disabled={disabled} onClick={() => toggleSubject(slug)} key={slug}>
                <SubjectIcon subject={slug} /><span>{subject.name}</span><i><Check aria-hidden="true" /></i>
              </button>;
            })}
          </div>
          {subjects.length === 0 && <p className="start-inline-note">Нужен хотя бы один предмет, чтобы перейти к тарифам.</p>}
        </>}

        {step === 3 && <>
          <div className="start-stage-heading"><span>Шаг 3 из 4</span><h1>Теперь понятно,<br /><em>сколько и за что.</em></h1><p>Выбрано: {selectedSubjectNames.join(", ")}. Показываем только тарифы, в которые помещается твоя комбинация.</p></div>
          <div className="start-plan-grid">
            {plans.map((plan, index) => {
              const unavailable = subjects.length > plan.maxSubjects;
              const selected = planCode === plan.code;
              return <button className={`${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => setPlanCode(plan.code)} key={plan.code}>
                {index === 1 && !unavailable && <span className="start-plan-badge"><Sparkles aria-hidden="true" /> баланс поддержки</span>}
                <small>до {plan.maxSubjects} предметов</small><h2>{plan.name}</h2><strong>{plan.pricesMinor[subjects.length] ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 }).format(plan.pricesMinor[subjects.length] / 100) + " / месяц" : "Цена появится до открытия оплаты"}</strong>
                <ul>{plan.features.slice(0, 4).map((feature) => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
                <i>{unavailable ? `Нужно сократить выбор до ${plan.maxSubjects}` : selected ? "Выбрано" : "Выбрать"}<Check aria-hidden="true" /></i>
              </button>;
            })}
          </div>
          <p className="start-inline-note"><LockKeyhole aria-hidden="true" /> Цена берётся из базы школы. Оплата на этом шаге не проводится.</p>
        </>}

        {step === 4 && selectedPlan && <>
          <div className="start-stage-heading"><span>Шаг 4 из 4</span><h1>Вот твой план.<br /><em>Без сюрпризов.</em></h1><p>Проверь выбор перед регистрацией. Оплаты при создании аккаунта не будет.</p></div>
          <div className="start-summary">
            <div className="start-summary-main"><span>Твоя комбинация</span><strong>{exam.toUpperCase()} · {grade} класс</strong><h2>{selectedSubjectNames.join(" + ")}</h2><p>{selectedPlan.name} · {selectedPriceLabel ?? "цена будет опубликована до оплаты"}</p></div>
            <div className="start-summary-steps"><span><b>сейчас</b> создаёшь аккаунт</span><i aria-hidden="true" /><span><b>потом</b> уточняешь цели и расписание</span><i aria-hidden="true" /><span><b>только после</b> подтверждаешь оплату</span></div>
          </div>
          <div className="start-registration-panel"><div><LockKeyhole aria-hidden="true" /><p><strong>Без оплаты на первом шаге</strong><span>Сначала аккаунт и полные условия. Платёж — только после твоего подтверждения.</span></p></div><Link className="button button-primary button-large" href={registrationHref}>Перейти к регистрации <ArrowRight aria-hidden="true" /></Link></div>
        </>}
      </section>

      <div className="start-controls">
        {step > 1 ? <button className="start-previous" type="button" onClick={goBack}><ChevronLeft aria-hidden="true" /> Назад</button> : <span />}
        {step < 4 && <button className="button button-primary button-large" type="button" onClick={continueForward} disabled={(step === 2 && subjects.length === 0) || (step === 3 && !selectedPlan)}>{step === 3 ? "Проверить выбор" : "Продолжить"} <ArrowRight aria-hidden="true" /></button>}
      </div>
    </div>
  );
}
