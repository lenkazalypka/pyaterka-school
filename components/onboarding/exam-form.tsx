"use client";

import { useState } from "react";
import { saveExamStep } from "@/app/onboarding/actions";
import type { ExamOption } from "@/types/onboarding";
import { FormShell } from "./form-shell";

export function ExamForm({ exams, selectedId, grade }: { exams: ExamOption[]; selectedId: string; grade: number }) {
  const [selected, setSelected] = useState(selectedId);
  const choice = exams.find((exam) => exam.id === selected);
  const unusual = choice && ((grade === 11 && choice.code === "oge") || (grade === 9 && choice.code === "ege"));
  return <FormShell action={saveExamStep} hidden={<input type="hidden" name="examTypeId" value={selected}/>}>
    <div className="grid gap-4 sm:grid-cols-2">{exams.map((exam) => <button type="button" key={exam.id} onClick={() => setSelected(exam.id)} aria-pressed={selected === exam.id} className={`min-h-32 rounded-2xl border p-5 text-left transition ${selected === exam.id ? "border-[var(--brand-primary)] bg-[var(--brand-soft)]" : "border-[var(--border-soft)] bg-white hover:border-[var(--brand-primary)]"}`}><b className="text-3xl">{exam.name}</b><span className="mt-2 block text-sm text-[var(--text-muted)]">{exam.code === "ege" ? "Поступление после 11 класса" : "Аттестация после 9 класса"}</span></button>)}</div>
    {unusual && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Для {grade} класса чаще выбирают {grade === 11 ? "ЕГЭ" : "ОГЭ"}. Мы не блокируем выбор — проверьте, что всё верно.</p>}
  </FormShell>;
}
