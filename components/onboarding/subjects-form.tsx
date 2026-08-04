"use client";

import { useMemo, useState } from "react";
import { saveSubjectsStep } from "@/app/onboarding/actions";
import type { SubjectDraft, SubjectOption } from "@/types/onboarding";
import { FormShell, fieldClass, textareaClass } from "./form-shell";

const fresh = (subject: SubjectOption): SubjectDraft => ({ subjectId: subject.id, currentGrade: 4, lastMockScore: null, confidence: 5, targetScore: Math.min(subject.maxScore, subject.scoreUnit === "test_score" ? 80 : Math.round(subject.maxScore * .8)), weakTopics: [], comment: "" });

export function SubjectsForm({ subjects, initial }: { subjects: SubjectOption[]; initial: SubjectDraft[] }) {
  const [drafts, setDrafts] = useState<SubjectDraft[]>(initial);
  const byId = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const update = (id: string, patch: Partial<SubjectDraft>) => setDrafts((items) => items.map((item) => item.subjectId === id ? { ...item, ...patch } : item));
  const toggle = (subject: SubjectOption) => setDrafts((items) => items.some((item) => item.subjectId === subject.id) ? items.filter((item) => item.subjectId !== subject.id) : items.length < 4 ? [...items, fresh(subject)] : items);
  return <FormShell action={saveSubjectsStep} hidden={<input type="hidden" name="subjects" value={JSON.stringify(drafts)}/>}>
    <p className="text-[var(--text-muted)]">Выберите до четырёх предметов. После выбора тарифа проверим его лимит.</p>
    <div className="grid gap-3 sm:grid-cols-2">{subjects.map((subject) => {
      const active = drafts.some((draft) => draft.subjectId === subject.id);
      return <button key={subject.id} type="button" onClick={() => toggle(subject)} aria-pressed={active} className={`rounded-xl border px-4 py-4 text-left font-bold ${active ? "border-[var(--brand-primary)] bg-[var(--brand-soft)]" : "border-[var(--border-soft)] bg-white"}`}>{subject.name}<small className="mt-1 block font-normal text-[var(--text-muted)]">до {subject.maxScore} · {subject.scoreLabel.toLowerCase()}</small></button>;
    })}</div>
    {drafts.length === 4 && <p className="text-sm text-[var(--text-muted)]">Достигнут временный лимит: 4 предмета.</p>}
    <div className="space-y-4">{drafts.map((draft) => {
      const subject = byId.get(draft.subjectId)!;
      return <fieldset key={draft.subjectId} className="rounded-2xl border border-[var(--border-soft)] bg-white p-5"><legend className="px-2 text-xl font-extrabold">{subject.name}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-bold">Оценка<select className={fieldClass} value={draft.currentGrade} onChange={(e) => update(draft.subjectId,{currentGrade:Number(e.target.value)})}>{[2,3,4,5].map((value)=><option key={value}>{value}</option>)}</select></label>
          <label className="text-sm font-bold">Последний пробник<input className={fieldClass} type="number" min="0" max={subject.maxScore} value={draft.lastMockScore ?? ""} placeholder="Если был" onChange={(e) => update(draft.subjectId,{lastMockScore:e.target.value === "" ? null : Number(e.target.value)})}/><small className="mt-1 block font-normal text-[var(--text-muted)]">{subject.scoreLabel}, 0–{subject.maxScore}</small></label>
          <label className="text-sm font-bold">Цель<input className={fieldClass} type="number" min="0" max={subject.maxScore} value={draft.targetScore} onChange={(e) => update(draft.subjectId,{targetScore:Number(e.target.value)})} required/><small className="mt-1 block font-normal text-[var(--text-muted)]">{subject.scoreLabel}, 0–{subject.maxScore}</small></label>
          <label className="text-sm font-bold sm:col-span-2 lg:col-span-3">Уверенность: {draft.confidence} из 10<input className="mt-3 w-full accent-[var(--brand-primary)]" type="range" min="1" max="10" value={draft.confidence} onChange={(e) => update(draft.subjectId,{confidence:Number(e.target.value)})}/></label>
          <label className="text-sm font-bold sm:col-span-2">Слабые темы<input className={fieldClass} value={draft.weakTopics.join(", ")} placeholder="Например: пунктуация, сочинение" onChange={(e) => update(draft.subjectId,{weakTopics:e.target.value.split(",").map((value)=>value.trim()).filter(Boolean)})}/></label>
          <label className="text-sm font-bold sm:col-span-2 lg:col-span-3">Комментарий<textarea className={textareaClass} value={draft.comment} onChange={(e) => update(draft.subjectId,{comment:e.target.value})}/></label>
        </div>
      </fieldset>;
    })}</div>
  </FormShell>;
}
