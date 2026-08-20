"use client";

import { useActionState } from "react";
import { completeLesson, submitHomework, type LearningActionState } from "@/app/student/lessons/actions";

const initialState: LearningActionState = { error: null };

export function CompleteLessonForm({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [state, action, pending] = useActionState(completeLesson, initialState);
  return <form action={action} className="student-learning-action">
    <input type="hidden" name="lessonId" value={lessonId} />
    <button className="button button-light" type="submit" disabled={pending || completed}>
      {completed ? "Урок пройден" : pending ? "Сохраняем…" : "Отметить как пройденный"}
    </button>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
  </form>;
}

export function HomeworkSubmissionForm({ assignmentId, lessonId, answer, status }: { assignmentId: string; lessonId: string; answer: string; status: string | null }) {
  const [state, action, pending] = useActionState(submitHomework, initialState);
  const locked = status === "under_review" || status === "checked";
  return <form action={action} className="student-homework-form">
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <input type="hidden" name="lessonId" value={lessonId} />
    <label htmlFor={`answer-${assignmentId}`}>Ваш ответ</label>
    <textarea id={`answer-${assignmentId}`} name="answer" defaultValue={answer} maxLength={12000} required disabled={locked} placeholder="Введите решение или пояснение" />
    <button className="button button-primary button-small" type="submit" disabled={pending || locked}>{pending ? "Сохраняем…" : status === "submitted" ? "Обновить ответ" : locked ? "Ответ на проверке" : "Отправить ответ"}</button>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
  </form>;
}
