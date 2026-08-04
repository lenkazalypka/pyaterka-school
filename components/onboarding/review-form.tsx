"use client";

import Link from "next/link";
import { completeOnboarding } from "@/app/onboarding/actions";
import { weekdays } from "@/lib/onboarding-config";
import type { ReviewData } from "@/types/onboarding";
import { FormShell } from "./form-shell";

const money=(minor:number,currency:string)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);
function Section({ title, href, children }: { title:string; href:string; children:React.ReactNode }) { return <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{title}</h2><Link className="text-sm font-bold text-[var(--brand-primary)]" href={href}>Изменить</Link></div><div className="mt-3 text-sm text-[var(--text-muted)]">{children}</div></section>; }

export function ReviewForm({ data, idempotencyKey }: { data:ReviewData; idempotencyKey:string }) {
  return <FormShell action={completeOnboarding} submitLabel="Завершить онбординг" hidden={<input type="hidden" name="idempotencyKey" value={idempotencyKey}/>}>
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="Ученик" href="/onboarding/profile"><p className="font-bold text-[var(--text-primary)]">{data.profile.firstName} {data.profile.lastName}</p><p>{data.profile.grade} класс · {data.profile.city}</p><p>{data.profile.school} · {data.profile.timezone}</p></Section>
      <Section title="Экзамен" href="/onboarding/exam"><p className="text-2xl font-extrabold text-[var(--text-primary)]">{data.exam}</p></Section>
      <Section title="Предметы" href="/onboarding/subjects"><ul className="space-y-2">{data.subjects.map((subject)=><li key={subject.subjectId}><b className="text-[var(--text-primary)]">{subject.name}</b>: оценка {subject.currentGrade}, цель {subject.targetScore} ({subject.scoreLabel.toLowerCase()})</li>)}</ul></Section>
      <Section title="Цели поступления" href="/onboarding/goals"><ol className="space-y-2">{data.goals.map((goal)=><li key={goal.priority}>{goal.priority}. <b className="text-[var(--text-primary)]">{goal.institutionName}</b> · {goal.directionName}, {goal.city}</li>)}</ol></Section>
      <Section title="Режим" href="/onboarding/schedule"><p>{data.schedule.weeklyHours} ч/нед · {data.schedule.preferredFormat}</p><p>{data.schedule.slots.map((slot)=>weekdays.find((day)=>day.value===slot.weekday)?.label).join(", ")} · {data.schedule.slots[0]?.startsAt}–{data.schedule.slots[0]?.endsAt}</p><p>{data.schedule.timezone}</p></Section>
      <Section title="Родитель" href="/onboarding/parent">{data.parent.inviteRequested?<><p className="font-bold text-[var(--text-primary)]">{data.parent.parentName}</p><p>{data.parent.relation} · {data.parent.email}</p></>:<p>Приглашение будет отправлено позже.</p>}</Section>
      <Section title="Тариф" href="/onboarding/plan"><p className="text-xl font-extrabold text-[var(--text-primary)]">{data.plan.name}</p><p>{money(data.plan.basePriceMinor,data.plan.currency)} / месяц · до {data.plan.maxSubjects} предметов</p><p className="mt-2">Подписка будет создана со статусом «ожидает ручной активации». Оплата не считается произведённой.</p></Section>
    </div>
    <p className="rounded-xl bg-[var(--brand-soft)] p-4 text-sm text-[var(--brand-burgundy)]">После завершения коммерческие условия нельзя изменить напрямую. Администратор проверит и активирует подписку вручную.</p>
  </FormShell>;
}
