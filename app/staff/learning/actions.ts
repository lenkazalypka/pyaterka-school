"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAnyRole } from "@/lib/auth";
import { logError, logEvent } from "@/lib/observability";

const uuid = z.uuid();
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const dateTime = z.string().refine((value) => Number.isFinite(new Date(value).getTime()), "Некорректная дата");

function editorRedirect(kind: "status" | "error", message: string): never {
  redirect(`/staff/learning?${kind}=${encodeURIComponent(message)}`);
}

async function groupContext(groupId: string, requestedTeacherId: string | null) {
  const context = await requireAnyRole(["teacher"]);
  const { db, user, roles } = context;
  const { data: group } = await db.from("groups").select("id,timezone,program_id").eq("id", groupId).maybeSingle();
  if (!group) editorRedirect("error", "Группа недоступна");
  const { data: program } = await db.from("programs").select("subject_id").eq("id", group.program_id).maybeSingle();
  if (!program) editorRedirect("error", "Программа группы недоступна");
  const teacherId = roles.includes("teacher") && !roles.includes("admin") ? user.id : requestedTeacherId;
  if (!teacherId) editorRedirect("error", "Выберите преподавателя");
  const { data: teacher } = await db.from("group_teachers").select("teacher_id").eq("group_id", group.id).eq("teacher_id", teacherId).maybeSingle();
  if (!teacher) editorRedirect("error", "Преподаватель не назначен в эту группу");
  return { ...context, group, subjectId: program.subject_id, teacherId };
}

const lessonSchema = z.object({
  groupId: uuid,
  teacherId: uuid.optional(),
  topicId: uuid.optional(),
  title: text(3, 180),
  description: z.string().trim().max(2000).optional(),
  objectives: z.string().trim().max(1600).optional(),
  startsAt: dateTime,
  durationMinutes: z.coerce.number().int().min(20).max(300),
  materialTitle: z.string().trim().max(180).optional(),
  materialUrl: z.string().trim().max(2000).optional(),
  assignmentTitle: z.string().trim().max(180).optional(),
  assignmentDescription: z.string().trim().max(3000).optional(),
  dueAt: z.string().optional(),
  maxScore: z.coerce.number().positive().max(1000).optional(),
});

export async function createLesson(formData: FormData) {
  const parsed = lessonSchema.safeParse({
    ...Object.fromEntries(formData),
    teacherId: String(formData.get("teacherId") ?? "") || undefined,
    topicId: String(formData.get("topicId") ?? "") || undefined,
    maxScore: String(formData.get("maxScore") ?? "") || undefined,
  });
  if (!parsed.success) editorRedirect("error", parsed.error.issues[0]?.message ?? "Проверьте поля урока");
  const context = await groupContext(parsed.data.groupId, parsed.data.teacherId ?? null);
  const { db, user, group, subjectId, teacherId } = context;

  if (parsed.data.topicId) {
    const { data: topic } = await db.from("topics").select("id,modules(programs(subject_id))").eq("id", parsed.data.topicId).maybeSingle();
    const topicSubject = (topic?.modules as unknown as { programs: { subject_id: string } | null } | null)?.programs?.subject_id;
    if (!topic || topicSubject !== subjectId) editorRedirect("error", "Тема не относится к предмету группы");
  }
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const objectives = (parsed.data.objectives ?? "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const { data: lesson, error: lessonError } = await db.from("lessons").insert({
    group_id: group.id,
    subject_id: subjectId,
    teacher_id: teacherId,
    topic_id: parsed.data.topicId ?? null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    objectives,
    status: "scheduled",
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (lessonError || !lesson) { logError("lesson.create.failed", lessonError ?? new Error("No lesson")); editorRedirect("error", "Не удалось создать урок"); }

  const { error: eventError } = await db.from("schedule_events").insert({
    lesson_id: lesson.id,
    group_id: group.id,
    subject_id: subjectId,
    event_type: "live_lesson",
    title: parsed.data.title,
    description: parsed.data.description || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone: group.timezone,
    status: "scheduled",
  });
  if (eventError) { await db.from("lessons").delete().eq("id", lesson.id); logError("lesson.schedule.failed", eventError); editorRedirect("error", "Не удалось добавить урок в расписание"); }

  if (parsed.data.materialUrl || parsed.data.materialTitle) {
    let url: URL;
    try { url = new URL(parsed.data.materialUrl ?? ""); } catch { editorRedirect("error", "Проверьте ссылку на материал"); }
    if (url.protocol !== "https:") editorRedirect("error", "Материал должен открываться по HTTPS");
    if (!parsed.data.materialTitle) editorRedirect("error", "Укажите название материала");
    const { data: material, error: materialError } = await db.from("materials").insert({
      owner_id: user.id,
      title: parsed.data.materialTitle,
      material_type: "link",
      external_url: url.toString(),
      published_at: new Date().toISOString(),
    }).select("id").single();
    if (materialError || !material) { logError("lesson.material.failed", materialError ?? new Error("No material")); editorRedirect("error", "Урок создан, но материал не прикреплён"); }
    const { error: linkError } = await db.from("lesson_materials").insert({ lesson_id: lesson.id, material_id: material.id, position: 0 });
    if (linkError) { logError("lesson.material_link.failed", linkError); editorRedirect("error", "Урок создан, но материал не прикреплён"); }
  }

  if (parsed.data.assignmentTitle || parsed.data.dueAt) {
    if (!parsed.data.assignmentTitle || !parsed.data.dueAt) editorRedirect("error", "Для ДЗ нужны название и дедлайн");
    const due = new Date(parsed.data.dueAt);
    if (!Number.isFinite(due.getTime()) || due <= startsAt) editorRedirect("error", "Дедлайн ДЗ должен быть после начала урока");
    const { data: assignment, error: assignmentError } = await db.from("assignments").insert({
      lesson_id: lesson.id,
      group_id: group.id,
      subject_id: subjectId,
      teacher_id: teacherId,
      title: parsed.data.assignmentTitle,
      description: parsed.data.assignmentDescription || null,
      due_at: due.toISOString(),
      max_score: parsed.data.maxScore ?? 10,
      status: "published",
    }).select("id").single();
    if (assignmentError || !assignment) { logError("assignment.create.failed", assignmentError ?? new Error("No assignment")); editorRedirect("error", "Урок создан, но ДЗ не добавлено"); }
    const questionIds = formData.getAll("questionIds").map(String).filter((value) => uuid.safeParse(value).success).slice(0, 50);
    if (questionIds.length) {
      const { data: questions } = await db.from("question_bank").select("id").eq("subject_id", subjectId).eq("status", "published").in("id", questionIds);
      const rows = (questions ?? []).map((question, position) => ({ assignment_id: assignment.id, question_id: question.id, position, points: 1 }));
      if (rows.length) {
        const { error: questionError } = await db.from("assignment_questions").insert(rows);
        if (questionError) { logError("assignment.questions.failed", questionError); editorRedirect("error", "ДЗ создано, но задания банка не прикреплены"); }
      }
    }
  }
  logEvent("lesson.created", { has_material: Boolean(parsed.data.materialUrl), has_assignment: Boolean(parsed.data.assignmentTitle) });
  revalidatePath("/staff/learning");
  revalidatePath("/student/lessons");
  editorRedirect("status", "Урок создан и опубликован");
}

const questionSchema = z.object({
  subjectId: uuid,
  topicId: uuid.optional(),
  prompt: text(3, 4000),
  answer: text(1, 4000),
  difficulty: z.coerce.number().int().min(1).max(3),
  status: z.enum(["draft", "published"]),
});

async function validateQuestionData(formData: FormData) {
  const parsed = questionSchema.safeParse({
    ...Object.fromEntries(formData),
    topicId: String(formData.get("topicId") ?? "") || undefined,
  });
  if (!parsed.success) editorRedirect("error", parsed.error.issues[0]?.message ?? "Проверьте задание");
  const context = await requireAnyRole(["teacher"]);
  const { data: subject } = await context.db.from("subjects").select("id").eq("id", parsed.data.subjectId).maybeSingle();
  if (!subject) editorRedirect("error", "Предмет недоступен");
  if (parsed.data.topicId) {
    const { data: topic } = await context.db.from("topics").select("id,modules(programs(subject_id))").eq("id", parsed.data.topicId).maybeSingle();
    const topicSubject = (topic?.modules as unknown as { programs: { subject_id: string } | null } | null)?.programs?.subject_id;
    if (!topic || topicSubject !== parsed.data.subjectId) editorRedirect("error", "Тема не относится к предмету");
  }
  return { ...context, value: parsed.data };
}

export async function createQuestion(formData: FormData) {
  const { db, user, value } = await validateQuestionData(formData);
  const { data: question, error } = await db.from("question_bank").insert({
    subject_id: value.subjectId,
    topic_id: value.topicId ?? null,
    author_id: user.id,
    prompt: value.prompt,
    difficulty: value.difficulty,
    status: value.status,
  }).select("id").single();
  if (error || !question) { logError("question.create.failed", error ?? new Error("No question")); editorRedirect("error", "Не удалось создать задание"); }
  const { error: answerError } = await db.from("question_answers").insert({ question_id: question.id, answer: value.answer });
  if (answerError) { await db.from("question_bank").delete().eq("id", question.id); logError("question.answer.failed", answerError); editorRedirect("error", "Не удалось сохранить ответ"); }
  logEvent("question.created", { status: value.status });
  revalidatePath("/staff/learning");
  editorRedirect("status", "Задание добавлено в банк");
}

export async function updateQuestion(formData: FormData) {
  const questionId = uuid.safeParse(formData.get("questionId"));
  if (!questionId.success) editorRedirect("error", "Задание не найдено");
  const { db, value } = await validateQuestionData(formData);
  const { error } = await db.from("question_bank").update({
    subject_id: value.subjectId,
    topic_id: value.topicId ?? null,
    prompt: value.prompt,
    difficulty: value.difficulty,
    status: value.status,
    updated_at: new Date().toISOString(),
  }).eq("id", questionId.data);
  if (error) { logError("question.update.failed", error); editorRedirect("error", "Не удалось обновить задание"); }
  const { error: answerError } = await db.from("question_answers").update({ answer: value.answer, updated_at: new Date().toISOString() }).eq("question_id", questionId.data);
  if (answerError) { logError("question.answer_update.failed", answerError); editorRedirect("error", "Условие обновлено, но ответ сохранить не удалось"); }
  logEvent("question.updated");
  revalidatePath("/staff/learning");
  editorRedirect("status", "Задание обновлено");
}

export async function deleteQuestion(formData: FormData) {
  const questionId = uuid.safeParse(formData.get("questionId"));
  if (!questionId.success) editorRedirect("error", "Задание не найдено");
  const { db } = await requireAnyRole(["teacher"]);
  const { error } = await db.from("question_bank").delete().eq("id", questionId.data);
  if (error) { logError("question.delete.failed", error); editorRedirect("error", "Нельзя удалить задание, уже включённое в ДЗ"); }
  logEvent("question.deleted");
  revalidatePath("/staff/learning");
  editorRedirect("status", "Задание удалено");
}
