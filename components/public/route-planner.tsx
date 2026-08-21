"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ArrowRight, BadgePercent, Check, CreditCard, Landmark, ReceiptText, Route, Smartphone, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { saveRouteLead, type RouteLeadState } from "@/app/public-actions";
import type { PricingCatalog, PricingPlanType } from "@/lib/pricing";
import styles from "./redesign-v1.module.css";

const initialState: RouteLeadState = { error: null };
const subjects = [
  ["russian", "Русский язык"], ["math", "Математика"], ["social", "Обществознание"], ["history", "История"],
  ["physics", "Физика"], ["chemistry", "Химия"], ["informatics", "Информатика"], ["english", "Английский"],
] as const;
const planTypes: PricingPlanType[] = ["self", "standard", "advanced"];
const planDescriptions: Record<PricingPlanType, string> = {
  self: "Самостоятельная подготовка в своём темпе",
  standard: "Занятия, проверка и контроль прогресса",
  advanced: "Максимум персонализации и поддержки",
};
const paymentMethods = [
  [CreditCard, "Банковская карта", "Оплата через ЮKassa"],
  [Smartphone, "СБП", "Если доступно в платёжной форме"],
  [WalletCards, "Рассрочка", "Условия подтверждаются отдельно"],
  [Landmark, "Материнский капитал", "После проверки документов"],
  [ReceiptText, "Налоговый вычет", "Предоставим документы при наличии основания"],
] as const;

function money(minor: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

function pluralSubjects(count: number) {
  return count === 1 ? "предмет" : count < 5 ? "предмета" : "предметов";
}

export function RoutePlanner({ enabled, pricing }: { enabled: boolean; pricing: PricingCatalog }) {
  const [exam, setExam] = useState<"ege" | "oge">("ege");
  const [grade, setGrade] = useState(11);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["russian"]);
  const [goalScore, setGoalScore] = useState(80);
  const [duration, setDuration] = useState<1 | 3 | 6 | 12>(3);
  const [planType, setPlanType] = useState<PricingPlanType>("standard");
  const [annualPlanType, setAnnualPlanType] = useState<PricingPlanType>("standard");
  const [annualSubjects, setAnnualSubjects] = useState(3);
  const [state, action, pending] = useActionState(saveRouteLead, initialState);

  const discountMap = useMemo(() => new Map(pricing.discounts.map((item) => [item.months, item.percent])), [pricing.discounts]);
  const rowsForSubjectCount = pricing.plans.filter((plan) => plan.subjectsCount === selectedSubjects.length);
  const selectedPricing = rowsForSubjectCount.find((plan) => plan.type === planType) ?? rowsForSubjectCount[0];
  const discount = discountMap.get(duration) ?? 0;
  const totalMinor = selectedPricing ? Math.round(selectedPricing.monthlyPriceMinor * duration * (100 - discount) / 100) : null;
  const monthlyAfterDiscount = totalMinor ? Math.round(totalMinor / duration) : null;
  const annualPricing = pricing.plans.find((plan) => plan.type === annualPlanType && plan.subjectsCount === annualSubjects);
  const annualDiscount = discountMap.get(12) ?? 0;
  const annualBase = annualPricing ? annualPricing.monthlyPriceMinor * 12 : null;
  const annualTotal = annualBase ? Math.round(annualBase * (100 - annualDiscount) / 100) : null;
  const annualSaving = annualBase && annualTotal ? annualBase - annualTotal : null;
  const entryPrice = pricing.plans.find((plan) => plan.type === "self" && plan.subjectsCount === 1)?.monthlyPriceMinor ?? null;
  const tutorMonthly = 200000 * 8;
  const comparisonRatio = entryPrice ? Math.floor(tutorMonthly / entryPrice) : null;

  function chooseExam(value: "ege" | "oge") {
    setExam(value);
    setGrade(value === "oge" ? 9 : 11);
  }

  function toggleSubject(code: string) {
    setSelectedSubjects((current) => current.includes(code)
      ? current.length === 1 ? current : current.filter((item) => item !== code)
      : current.length < 4 ? [...current, code] : current);
  }

  return <section className={styles.planner} id="calculator" aria-labelledby="calculator-title">
    <div className={styles.plannerIntro}>
      <span>Стоимость без сюрпризов</span>
      <h2 id="calculator-title">собери свой маршрут подготовки</h2>
      <p>Узнай стоимость обучения под твою цель, предметы и срок. Каталог и скидки приходят из Supabase, итог повторно считается на сервере.</p>
    </div>

    <div className={styles.pricingWorkspace}>
      <div className={styles.pricingControls}>
        <fieldset><legend><span>01</span> Экзамен</legend><div>{(["ege", "oge"] as const).map((value) => <button type="button" aria-pressed={exam === value} onClick={() => chooseExam(value)} key={value}>{value.toUpperCase()}</button>)}</div></fieldset>
        <fieldset><legend><span>02</span> Класс</legend><div>{[9, 10, 11].map((value) => {
          const unavailable = exam === "oge" ? value !== 9 : value === 9;
          return <button type="button" aria-pressed={grade === value} disabled={unavailable} onClick={() => setGrade(value)} key={value}>{value}</button>;
        })}</div></fieldset>
        <fieldset><legend><span>03</span> Предметы <small>{selectedSubjects.length} / 4</small></legend><div className={styles.pricingSubjects}>{subjects.map(([code, label]) => <button type="button" aria-pressed={selectedSubjects.includes(code)} disabled={!selectedSubjects.includes(code) && selectedSubjects.length >= 4} onClick={() => toggleSubject(code)} key={code}>{selectedSubjects.includes(code) && <Check aria-hidden="true" />}{label}</button>)}</div></fieldset>
        <fieldset><legend><span>04</span> Цель</legend><div className={styles.scoreOptions}>{[70, 80, 90].map((value) => <button type="button" aria-pressed={goalScore === value} onClick={() => setGoalScore(value)} key={value}>{value}+</button>)}</div></fieldset>
        <fieldset><legend><span>05</span> Срок</legend><div className={styles.durationOptions}>{([1, 3, 6, 12] as const).map((months) => <button type="button" aria-pressed={duration === months} onClick={() => setDuration(months)} key={months}><b>{months === 12 ? "12 месяцев" : `${months} ${months === 1 ? "месяц" : "месяца"}`}</b><small>{(discountMap.get(months) ?? 0) > 0 ? `−${discountMap.get(months)}%` : "без скидки"}</small></button>)}</div></fieldset>
      </div>

      <aside className={styles.priceSummary} aria-live="polite">
        <Route aria-hidden="true" />
        <span>Твой маршрут</span>
        <h3>{exam.toUpperCase()} · {selectedSubjects.length} {pluralSubjects(selectedSubjects.length)}</h3>
        {selectedPricing && totalMinor && monthlyAfterDiscount ? <>
          <p>{selectedPricing.name} · цель {goalScore}+ · {duration} мес.</p>
          <dl>
            <div><dt>В месяц</dt><dd>{money(selectedPricing.monthlyPriceMinor, selectedPricing.currency)}</dd></div>
            <div><dt>Скидка</dt><dd>{discount ? `−${discount}%` : "—"}</dd></div>
            <div><dt>После скидки</dt><dd>{money(monthlyAfterDiscount, selectedPricing.currency)} / мес.</dd></div>
          </dl>
          <div className={styles.priceTotal}><small>Итого за период</small><strong>{money(totalMinor, selectedPricing.currency)}</strong></div>
        </> : <div className={styles.priceUnavailable}><b>Каталог ещё не опубликован</b><p>Мы не подставляем демонстрационную цену. После применения migration здесь появится реальный расчёт.</p></div>}
        <a href="#personal-plan">Получить персональный план <ArrowRight aria-hidden="true" /></a>
      </aside>
    </div>

    <div className={styles.pricingCards} id="plans" aria-label="Тарифы ELIO">
      {planTypes.map((type, index) => {
        const row = rowsForSubjectCount.find((plan) => plan.type === type);
        if (!row) return null;
        const selected = planType === type;
        return <article className={`${styles.pricingCard} ${type === "standard" ? styles.pricingPopular : ""}`} key={type}>
          <div className={styles.pricingCardTop}><span>пакет {String(index + 1).padStart(2, "0")}</span>{type === "standard" && <b>чаще выбирают</b>}</div>
          <h3>{row.name}</h3><p>{planDescriptions[type]}</p>
          <strong>{money(row.monthlyPriceMinor, row.currency)} <small>/ месяц</small></strong>
          <ul>{row.included.map((feature) => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
          {row.excluded.length > 0 && <ul className={styles.pricingExcluded}>{row.excluded.map((feature) => <li key={feature}><X aria-hidden="true" />{feature}</li>)}</ul>}
          <button type="button" aria-pressed={selected} onClick={() => setPlanType(type)}>{selected ? "Выбрано" : "Выбрать тариф"}<ArrowRight aria-hidden="true" /></button>
        </article>;
      })}
    </div>

    <section className={styles.tutorComparison} aria-labelledby="comparison-title">
      <div><span>Сравнение сценариев</span><h2 id="comparison-title">репетитор или ELIO?</h2><p>Считаем прозрачный пример: ставка репетитора 2 000 ₽ и два занятия в неделю. Это не обещание рыночной цены.</p></div>
      <div className={styles.comparisonCards}>
        <article><small>Репетитор</small><strong>2 000 ₽ / час</strong><p>8 занятий в месяц</p><b>≈ 16 000 ₽ / месяц</b></article>
        <article><small>ELIO</small><strong>{entryPrice ? `от ${money(entryPrice)}` : "цена из Supabase"}</strong><p>Платформа, маршрут и учебные инструменты</p>{comparisonRatio && <b>в этом сценарии примерно в {comparisonRatio} раза ниже</b>}</article>
      </div>
    </section>

    <section className={styles.annualCalculator} aria-labelledby="annual-title">
      <div><span>Годовой маршрут</span><h2 id="annual-title">фиксируй горизонт,<br />а не хаос.</h2><p>Двенадцатимесячная скидка применяется один раз к полной стоимости периода.</p></div>
      <div className={styles.annualControls}>
        <fieldset><legend>Тариф</legend><div>{planTypes.map((type) => <button type="button" aria-pressed={annualPlanType === type} onClick={() => setAnnualPlanType(type)} key={type}>{pricing.plans.find((plan) => plan.type === type)?.name ?? type}</button>)}</div></fieldset>
        <fieldset><legend>Предметы</legend><div>{[1, 2, 3, 4].map((count) => <button type="button" aria-pressed={annualSubjects === count} onClick={() => setAnnualSubjects(count)} key={count}>{count}</button>)}</div></fieldset>
        {annualPricing && annualBase && annualTotal && annualSaving ? <div className={styles.annualResult}>
          <div><small>{annualSubjects} {pluralSubjects(annualSubjects)} · в месяц</small><strong>{money(annualPricing.monthlyPriceMinor, annualPricing.currency)}</strong></div>
          <dl><div><dt>12 месяцев</dt><dd>{money(annualBase, annualPricing.currency)}</dd></div><div><dt>Со скидкой −{annualDiscount}%</dt><dd>{money(annualTotal, annualPricing.currency)}</dd></div></dl>
          <p><BadgePercent aria-hidden="true" /> экономия {money(annualSaving, annualPricing.currency)}</p>
        </div> : <p className={styles.catalogNotice}>Годовой расчёт появится после публикации каталога Supabase.</p>}
      </div>
    </section>

    <section className={styles.paymentSection} aria-labelledby="payment-title">
      <div><span>Оплата</span><h2 id="payment-title">оплачивай как удобно.</h2><p>Финальная доступность способа видна до подтверждения платежа. Доступ активирует только проверенный webhook ЮKassa.</p></div>
      <div>{paymentMethods.map(([Icon, title, copy]) => <article key={title}><Icon aria-hidden="true" /><b>{title}</b><p>{copy}</p></article>)}</div>
    </section>

    <section className={styles.personalPlan} id="personal-plan" aria-labelledby="personal-plan-title">
      <div><span>Следующий шаг</span><h2 id="personal-plan-title">начни подготовку сегодня</h2><p>Сохраним выбранный маршрут и свяжемся по телефону. Оплата не проводится.</p></div>
      <form action={action} className={styles.commercialLeadForm}>
        <input type="hidden" name="exam" value={exam} /><input type="hidden" name="subjectCodes" value={selectedSubjects.join(",")} />
        <input type="hidden" name="goalScore" value={goalScore} /><input type="hidden" name="durationMonths" value={duration} />
        <input type="hidden" name="pricingPlanId" value={selectedPricing?.id ?? ""} />
        <label>Имя<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
        <label>Класс<select name="grade" value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{(exam === "oge" ? [9] : [10, 11]).map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Телефон<input name="phone" required minLength={7} maxLength={30} autoComplete="tel" inputMode="tel" placeholder="+7 999 000-00-00" /></label>
        <label className={styles.leadConsent}><input name="consent" type="checkbox" required disabled={!enabled || !selectedPricing} /><span>Согласен на <Link href="/legal/consent">обработку данных</Link> для связи по выбранному плану</span></label>
        <button type="submit" disabled={pending || !enabled || !selectedPricing}>{pending ? "Сохраняем…" : enabled && selectedPricing ? <>Получить персональный план <ArrowRight aria-hidden="true" /></> : "Приём заявок пока закрыт"}</button>
        {!enabled && <p role="status" className={styles.formNotice}>Сохранение откроется после утверждения юридических документов.</p>}
        {enabled && !selectedPricing && <p role="status" className={styles.formNotice}>Публикация каталога Supabase обязательна до приёма заявок.</p>}
        {state.error && <p role="alert" className={styles.formError}>{state.error}</p>}
        {state.success && <p role="status" className={styles.formSuccess}>{state.success}</p>}
      </form>
    </section>

    <a className={styles.mobileStickyCta} href="#personal-plan">Получить план <ArrowRight aria-hidden="true" /></a>
  </section>;
}
