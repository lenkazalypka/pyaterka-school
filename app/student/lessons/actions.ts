"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { logError, logEvent } from "@/lib/observability";

export type LearningActionState = { error: string | null; success?: string | null };

export async function startLesson(_: LearningActionState, formData: FormData): Promise<LearningActionState> {
  const lessonId = z.uuid().safeParse(formData.get("lessonId"));
  if (!lessonId.success) return { error: "Урок не найден" };
  const { db } = await requireStudent();
  const { error } = await db.rpc("start_student_lesson", {
    p_lesson_id: lessonId.data,
    p_last_position_seconds: null,
  });
  if (error) {
    logError("learning.lesson_start.failed", error, { lesson_id: lessonId.data });
    return { error: "Не удалось начать урок" };
  }
  revalidatePath("/student");
  revalidatePath(`/student/lessons/${lessonId.data}`);
  logEvent("learning.lesson_started", { lesson_id: lessonId.data });
  return { error: null, success: "Урок добавлен в текущую работу" };
}

export async function completeLesson(_: LearningActionState, formData: FormData): Promise<LearningActionState> {
  const lessonId = z.uuid().safeParse(formData.get("lessonId"));
  if (!lessonId.success) return { error: "Урок не найден" };
  const { db } = await requireStudent();
  const { error } = await db.rpc("complete_student_lesson", { p_lesson_id: lessonId.data });
  if (error) {
    logError("learning.lesson_completion.failed", error, { lesson_id: lessonId.data });
    return { error: "Не удалось сохранить прохождение урока" };
  }
  revalidatePath("/student");
  revalidatePath(`/student/lessons/${lessonId.data}`);
  logEvent("learning.lesson_completed", { lesson_id: lessonId.data });
  return { error: null, success: "Урок отмечен как пройденный" };
}

export async function submitHomework(_: LearningActionState, formData: FormData): Promise<LearningActionState> {
  const parsed = z.object({
    assignmentId: z.uuid(),
    lessonId: z.uuid(),
    answer: z.string().trim().min(1, "Добавьте ответ").max(12000, "Ответ слишком длинный"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте ответ" };
  const { db } = await requireStudent();
  const { error } = await db.rpc("submit_student_homework", {
    p_assignment_id: parsed.data.assignmentId,
    p_answer: { text: parsed.data.answer },
  });
  if (error) {
    logError("learning.homework_submission.failed", error, { assignment_id: parsed.data.assignmentId });
    return { error: "Не удалось сохранить домашнее задание" };
  }
  revalidatePath("/student");
  revalidatePath(`/student/lessons/${parsed.data.lessonId}`);
  logEvent("learning.homework_submitted", { assignment_id: parsed.data.assignmentId });
  return { error: null, success: "Ответ сохранён и отправлен" };
}

export async function startHomework(_: LearningActionState, formData: FormData): Promise<LearningActionState> {
  const parsed = z.object({ assignmentId: z.uuid(), lessonId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Задание не найдено" };
  const { db } = await requireStudent();
  const { error } = await db.rpc("start_student_homework", { p_assignment_id: parsed.data.assignmentId });
  if (error) {
    logError("learning.homework_start.failed", error, { assignment_id: parsed.data.assignmentId });
    return { error: "Не удалось начать задание" };
  }
  revalidatePath("/student");
  revalidatePath(`/student/lessons/${parsed.data.lessonId}`);
  logEvent("learning.homework_started", { assignment_id: parsed.data.assignmentId });
  return { error: null, success: "Задание добавлено в текущую работу" };
}
