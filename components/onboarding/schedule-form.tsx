"use client";

import { useMemo, useState } from "react";
import { saveScheduleStep } from "@/app/onboarding/actions";
import { supportedTimezones, weekdays } from "@/lib/onboarding-config";
import type { ScheduleDraft } from "@/types/onboarding";
import { FormShell, fieldClass, textareaClass } from "./form-shell";

export function ScheduleForm({ initial }: { initial: ScheduleDraft }) {
  const initialDays = useMemo(()=>initial.slots.map((slot)=>slot.weekday),[initial.slots]);
  const [days,setDays]=useState(initialDays);
  const [start,setStart]=useState(initial.slots[0]?.startsAt.slice(0,5)??"17:00");
  const [end,setEnd]=useState(initial.slots[0]?.endsAt.slice(0,5)??"19:00");
  const [timezone,setTimezone]=useState(initial.timezone);
  const [settings,setSettings]=useState({...initial});
  const payload={...settings,timezone,slots:days.map((weekday)=>({weekday,startsAt:start,endsAt:end}))};
  return <FormShell action={saveScheduleStep} hidden={<input type="hidden" name="schedule" value={JSON.stringify(payload)}/>}>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Часов в неделю<input className={fieldClass} type="number" min="1" max="60" value={settings.weeklyHours} onChange={(e)=>setSettings({...settings,weeklyHours:Number(e.target.value)})}/></label>
      <label className="text-sm font-bold">Текущая нагрузка, ч/нед<input className={fieldClass} type="number" min="0" max="100" value={settings.currentWeeklyLoad} onChange={(e)=>setSettings({...settings,currentWeeklyLoad:Number(e.target.value)})}/></label>
      <label className="text-sm font-bold">Формат<select className={fieldClass} value={settings.preferredFormat} onChange={(e)=>setSettings({...settings,preferredFormat:e.target.value as ScheduleDraft["preferredFormat"]})}><option value="group">В группе</option><option value="individual">Индивидуально</option><option value="mixed">Смешанный</option></select></label>
      <label className="text-sm font-bold">Дата начала<input className={fieldClass} type="date" value={settings.desiredStartDate} onChange={(e)=>setSettings({...settings,desiredStartDate:e.target.value})}/></label>
      <label className="text-sm font-bold sm:col-span-2">Часовой пояс<select className={fieldClass} value={timezone} onChange={(e)=>setTimezone(e.target.value)}>{supportedTimezones.map((zone)=><option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
    </div>
    <fieldset><legend className="text-sm font-bold">Удобные дни</legend><div className="mt-3 flex flex-wrap gap-2">{weekdays.map((day)=><button type="button" key={day.value} onClick={()=>setDays((items)=>items.includes(day.value)?items.filter((value)=>value!==day.value):[...items,day.value].sort())} aria-pressed={days.includes(day.value)} className={`grid h-11 min-w-11 place-items-center rounded-xl border px-3 font-bold ${days.includes(day.value)?"border-[var(--brand-primary)] bg-[var(--brand-soft)]":"border-[var(--border-soft)] bg-white"}`}>{day.label}</button>)}</div></fieldset>
    <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold">С<input className={fieldClass} type="time" value={start} onChange={(e)=>setStart(e.target.value)}/></label><label className="text-sm font-bold">До<input className={fieldClass} type="time" value={end} onChange={(e)=>setEnd(e.target.value)}/></label></div>
    <label className="block text-sm font-bold">Другие курсы или репетиторы<textarea className={textareaClass} value={settings.otherCourses} onChange={(e)=>setSettings({...settings,otherCourses:e.target.value})} placeholder="Можно оставить пустым"/></label>
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-8"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.strictControl} onChange={(e)=>setSettings({...settings,strictControl:e.target.checked})}/>Нужен строгий контроль</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.dailyReminders} onChange={(e)=>setSettings({...settings,dailyReminders:e.target.checked})}/>Ежедневные напоминания</label></div>
  </FormShell>;
}
