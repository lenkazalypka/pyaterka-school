"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { savePlanStep } from "@/app/onboarding/actions";
import type { PlanOption } from "@/types/onboarding";
import { FormShell } from "./form-shell";

const featureLabels: Record<string,string> = { lessons:"2 занятия в неделю", materials:"Материалы", assignments:"Домашние задания", mock_exams:"Пробники", question_bank:"Банк заданий", student_dashboard:"Кабинет ученика", progress:"Прогресс подготовки", homework_review:"Проверка домашних заданий", recordings:"Записи занятий", analytics:"Аналитика прогресса", parent_reports:"Кабинет родителя", mini_groups:"Мини-группы", individual_plan:"Персональный маршрут", ai_error_analysis:"AI-анализ ошибок", adaptive_assignments:"Адаптивные задания", psychological_support:"Психологическая поддержка" };
const money=(minor:number,currency:string)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);

export function PlanForm({ plans, selectedId, subjectCount }: { plans: PlanOption[]; selectedId: string; subjectCount: number }) {
  const [selected,setSelected]=useState(selectedId);
  const selectedPlan=plans.find((plan)=>plan.id===selected);
  const overLimit=selectedPlan ? subjectCount>selectedPlan.maxSubjects : false;
  const priceFor=(plan:PlanOption)=>plan.pricesMinor[subjectCount]??null;
  return <FormShell action={savePlanStep} hidden={<input type="hidden" name="planId" value={selected}/>}>
    <p className="text-[var(--text-muted)]">Выбрано предметов: <b className="text-[var(--text-primary)]">{subjectCount}</b>. Цена берётся из базы и фиксируется сервером только после подтверждения.</p>
    <div className="grid gap-4 lg:grid-cols-3">{plans.map((plan)=>{const unavailable=subjectCount>plan.maxSubjects||!priceFor(plan);return <button type="button" key={plan.id} disabled={unavailable} onClick={()=>setSelected(plan.id)} aria-pressed={selected===plan.id} className={`rounded-2xl border p-5 text-left disabled:cursor-not-allowed disabled:opacity-55 ${selected===plan.id?"border-[var(--brand-primary)] bg-[var(--brand-soft)]":"border-[var(--border-soft)] bg-white"}`}>
      <span className="text-2xl font-extrabold">{plan.name}</span><span className="mt-2 block text-2xl font-extrabold text-[var(--brand-primary)]">{priceFor(plan)?money(priceFor(plan)!,plan.currency):"Цена не опубликована"}{priceFor(plan)&&<small className="font-normal text-[var(--text-muted)]"> / месяц</small>}</span>
      <span className={`mt-3 block text-sm font-bold ${unavailable||!priceFor(plan)?"text-[var(--brand-primary)]":"text-[var(--text-muted)]"}`}>{priceFor(plan)?`Для ${subjectCount} предметов`:`Нет цены для ${subjectCount} предметов`}</span>
      <span className="mt-4 block space-y-2">{plan.features.filter((feature)=>feature.enabled).map((feature)=><span key={feature.code} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]"/>{featureLabels[feature.code]??feature.code}{feature.limit!==null?`: ${feature.limit}`:""}</span>)}</span>
    </button>})}</div>
    {overLimit&&<div role="alert" className="rounded-xl bg-[var(--surface-rose)] p-4 text-sm text-[var(--brand-primary)]">Этот тариф не подходит: выберите тариф с большим лимитом или вернитесь к предметам и уменьшите их число.</div>}
  </FormShell>;
}
