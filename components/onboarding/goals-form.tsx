"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveGoalsStep } from "@/app/onboarding/actions";
import type { AdmissionGoalDraft } from "@/types/onboarding";
import { FormShell, fieldClass } from "./form-shell";

const emptyGoal = (priority: number): AdmissionGoalDraft => ({ institutionType:"university", institutionName:"", directionName:"", city:"", fundingType:"budget", priority, minimumPassingScore:null, desiredScore:250, needsAdmissionHelp:false, needsCareerGuidance:false });

export function GoalsForm({ initial }: { initial: AdmissionGoalDraft[] }) {
  const [goals, setGoals] = useState(initial.length ? initial : [emptyGoal(1)]);
  const update = (index: number, patch: Partial<AdmissionGoalDraft>) => setGoals((items) => items.map((item, position) => position === index ? { ...item, ...patch } : item));
  const remove = (index: number) => setGoals((items) => items.filter((_, position) => position !== index).map((item, position) => ({ ...item, priority: position + 1 })));
  return <FormShell action={saveGoalsStep} hidden={<input type="hidden" name="goals" value={JSON.stringify(goals)}/>}>
    <p className="text-[var(--text-muted)]">Можно указать вуз или колледж свободным текстом. Это цель, а не гарантия поступления.</p>
    <div className="space-y-4">{goals.map((goal,index)=><fieldset key={index} className="rounded-2xl border border-[var(--border-soft)] bg-white p-5"><legend className="px-2 text-lg font-extrabold">Цель #{index+1}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Тип<select className={fieldClass} value={goal.institutionType} onChange={(e)=>update(index,{institutionType:e.target.value as AdmissionGoalDraft["institutionType"]})}><option value="university">Вуз</option><option value="college">Колледж</option></select></label>
        <label className="text-sm font-bold">Учреждение<input className={fieldClass} value={goal.institutionName} onChange={(e)=>update(index,{institutionName:e.target.value})} required/></label>
        <label className="text-sm font-bold">Направление / специальность<input className={fieldClass} value={goal.directionName} onChange={(e)=>update(index,{directionName:e.target.value})} required/></label>
        <label className="text-sm font-bold">Город<input className={fieldClass} value={goal.city} onChange={(e)=>update(index,{city:e.target.value})} required/></label>
        <label className="text-sm font-bold">Форма оплаты<select className={fieldClass} value={goal.fundingType} onChange={(e)=>update(index,{fundingType:e.target.value as AdmissionGoalDraft["fundingType"]})}><option value="budget">Бюджет</option><option value="paid">Платное</option><option value="either">Рассмотрю оба</option></select></label>
        <label className="text-sm font-bold">Приоритет<input className={fieldClass} type="number" min="1" max="20" value={goal.priority} onChange={(e)=>update(index,{priority:Number(e.target.value)})}/></label>
        <label className="text-sm font-bold">Ожидаемый проходной<input className={fieldClass} type="number" min="0" max="500" value={goal.minimumPassingScore ?? ""} onChange={(e)=>update(index,{minimumPassingScore:e.target.value ? Number(e.target.value) : null})}/></label>
        <label className="text-sm font-bold">Желаемый общий результат<input className={fieldClass} type="number" min="0" max="500" value={goal.desiredScore} onChange={(e)=>update(index,{desiredScore:Number(e.target.value)})}/></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={goal.needsAdmissionHelp} onChange={(e)=>update(index,{needsAdmissionHelp:e.target.checked})}/>Нужна помощь с выбором</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={goal.needsCareerGuidance} onChange={(e)=>update(index,{needsCareerGuidance:e.target.checked})}/>Нужна профориентация</label></div>
      {goals.length>1&&<button type="button" onClick={()=>remove(index)} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-primary)]"><Trash2 className="h-4 w-4"/>Удалить цель</button>}
    </fieldset>)}</div>
    <button type="button" onClick={()=>setGoals((items)=>[...items,emptyGoal(items.length+1)])} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--brand-primary)] px-4 font-bold text-[var(--brand-primary)]"><Plus className="h-4 w-4"/>Добавить вариант</button>
  </FormShell>;
}
