"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { emailService } from "@/lib/email";
import { hashInvitationToken } from "@/lib/invitations";
import { logError, logEvent } from "@/lib/observability";
import { requireIncompleteOnboarding } from "@/lib/onboarding";
import { supportedTimezones } from "@/lib/onboarding-config";

export type OnboardingActionState = { error: string | null; fieldErrors?: Record<string, string[]> };
const resultError = (error: z.ZodError): OnboardingActionState => ({ error: "Проверьте отмеченные поля", fieldErrors: z.flattenError(error).fieldErrors });

function isTimezone(value: string) {
  if (!supportedTimezones.some((zone) => zone.value === value)) return false;
  try { new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(); return true; } catch { return false; }
}

async function advance(step: number) {
  const { db, user } = await requireIncompleteOnboarding();
  const { error } = await db.from("student_onboarding")
    .update({ current_step: step, updated_at: new Date().toISOString() })
    .eq("student_id", user.id).lt("current_step", step);
  if (error) throw new Error(error.message);
}

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Минимум 2 символа").max(80),
  lastName: z.string().trim().min(2, "Минимум 2 символа").max(80),
  birthDate: z.iso.date("Укажите дату рождения"),
  phone: z.string().trim().min(7, "Проверьте телефон").max(30),
  city: z.string().trim().min(2, "Укажите город").max(100),
  timezone: z.string().refine(isTimezone, "Выберите поддерживаемый часовой пояс"),
  grade: z.coerce.number().int().min(5).max(11),
  school: z.string().trim().min(2, "Укажите школу").max(160),
  contactMethod: z.enum(["email", "phone", "messenger"]),
});

export async function saveProfileStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return resultError(parsed.error);
  const { db, user } = await requireIncompleteOnboarding();
  const [profile, student] = await Promise.all([
    db.from("profiles").update({
      first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone,
      city: parsed.data.city, timezone: parsed.data.timezone, preferred_contact_method: parsed.data.contactMethod,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id),
    db.from("student_profiles").update({
      birth_date: parsed.data.birthDate, grade: parsed.data.grade, school: parsed.data.school,
      onboarding_status: "in_progress", updated_at: new Date().toISOString(),
    }).eq("user_id", user.id),
  ]);
  if (profile.error || student.error) return { error: "Не удалось сохранить профиль" };
  await advance(2);
  redirect("/onboarding/exam");
}

export async function saveExamStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const parsed = z.object({ examTypeId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return resultError(parsed.error);
  const { db, user } = await requireIncompleteOnboarding();
  const { data: exam } = await db.from("exam_types").select("id").eq("id", parsed.data.examTypeId).eq("active", true).maybeSingle();
  if (!exam) return { error: "Это направление сейчас недоступно" };
  const { error } = await db.from("student_onboarding").update({ exam_type_id: exam.id, current_step: 3, updated_at: new Date().toISOString() }).eq("student_id", user.id);
  if (error) return { error: "Не удалось сохранить направление" };
  redirect("/onboarding/subjects");
}

const subjectDraftSchema = z.object({
  subjectId: z.uuid(),
  currentGrade: z.number().int().min(2).max(5),
  lastMockScore: z.number().int().nonnegative().nullable(),
  confidence: z.number().int().min(1).max(10),
  targetScore: z.number().int().nonnegative(),
  weakTopics: z.array(z.string().trim().min(1).max(100)).max(20),
  comment: z.string().trim().max(1000),
});

export async function saveSubjectsStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  let payload: unknown;
  try { payload = JSON.parse(String(formData.get("subjects") ?? "[]")); } catch { return { error: "Не удалось прочитать предметы" }; }
  const parsed = z.array(subjectDraftSchema).min(1, "Выберите хотя бы один предмет").max(4, "До выбора тарифа можно выбрать до четырёх предметов").safeParse(payload);
  if (!parsed.success) return resultError(parsed.error);
  const { db, user, onboarding } = await requireIncompleteOnboarding();
  if (!onboarding?.exam_type_id) return { error: "Сначала выберите направление" };
  const ids = parsed.data.map((item) => item.subjectId);
  if (new Set(ids).size !== ids.length) return { error: "Предмет не должен повторяться" };
  const [{ data: subjects }, { data: rules }] = await Promise.all([
    db.from("subjects").select("id").in("id", ids).eq("exam_type_id", onboarding.exam_type_id).eq("active", true).is("deleted_at", null),
    db.from("exam_scoring_rules").select("subject_id,max_score,unit").eq("exam_type_id", onboarding.exam_type_id),
  ]);
  if ((subjects ?? []).length !== ids.length) return { error: "Один из предметов недоступен для выбранного экзамена" };
  const defaultRule = rules?.find((rule) => rule.subject_id === null);
  for (const item of parsed.data) {
    const rule = rules?.find((candidate) => candidate.subject_id === item.subjectId) ?? defaultRule;
    if (!rule || item.targetScore > rule.max_score || (item.lastMockScore !== null && item.lastMockScore > rule.max_score)) {
      return { error: "Баллы выходят за диапазон выбранного экзамена" };
    }
  }
  const { error: deleteError } = await db.from("student_subjects").delete().eq("student_id", user.id);
  if (deleteError) return { error: "Не удалось обновить предметы" };
  const { error } = await db.from("student_subjects").insert(parsed.data.map((item) => {
    const rule = rules?.find((candidate) => candidate.subject_id === item.subjectId) ?? defaultRule;
    return {
      student_id: user.id, subject_id: item.subjectId, current_grade: item.currentGrade,
      self_reported_last_mock_score: item.lastMockScore, confidence: item.confidence,
      target_score: item.targetScore, weak_topics: item.weakTopics, student_comment: item.comment || null,
      score_unit: rule?.unit ?? "test_score", status: "active",
    };
  }));
  if (error) return { error: "Не удалось сохранить предметы" };
  await advance(4);
  redirect("/onboarding/goals");
}

const goalSchema = z.object({
  institutionType: z.enum(["university", "college"]), institutionName: z.string().trim().min(2).max(200),
  directionName: z.string().trim().min(2).max(200), city: z.string().trim().min(2).max(100),
  fundingType: z.enum(["budget", "paid", "either"]), priority: z.number().int().min(1).max(20),
  minimumPassingScore: z.number().int().min(0).max(500).nullable(), desiredScore: z.number().int().min(0).max(500),
  needsAdmissionHelp: z.boolean(), needsCareerGuidance: z.boolean(),
});

export async function saveGoalsStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  let payload: unknown;
  try { payload = JSON.parse(String(formData.get("goals") ?? "[]")); } catch { return { error: "Не удалось прочитать цели" }; }
  const parsed = z.array(goalSchema).min(1, "Добавьте хотя бы одну цель").max(10).safeParse(payload);
  if (!parsed.success) return resultError(parsed.error);
  const priorities = parsed.data.map((goal) => goal.priority);
  if (new Set(priorities).size !== priorities.length) return { error: "Приоритеты целей не должны повторяться" };
  const { db, user } = await requireIncompleteOnboarding();
  const { error: deleteError } = await db.from("admission_goals").delete().eq("student_id", user.id).eq("status", "active");
  if (deleteError) return { error: "Не удалось обновить цели" };
  const { error } = await db.from("admission_goals").insert(parsed.data.map((goal) => ({
    student_id: user.id, institution_type: goal.institutionType, institution_name: goal.institutionName,
    direction_name: goal.directionName, city: goal.city, funding_type: goal.fundingType, priority: goal.priority,
    minimum_passing_score: goal.minimumPassingScore, desired_score: goal.desiredScore,
    needs_admission_help: goal.needsAdmissionHelp, needs_career_guidance: goal.needsCareerGuidance, status: "active",
  })));
  if (error) return { error: "Не удалось сохранить цели" };
  await advance(5);
  redirect("/onboarding/schedule");
}

const scheduleSchema = z.object({
  weeklyHours: z.number().int().min(1).max(60), preferredFormat: z.enum(["group", "individual", "mixed"]),
  strictControl: z.boolean(), dailyReminders: z.boolean(), otherCourses: z.string().trim().max(1000),
  currentWeeklyLoad: z.number().int().min(0).max(100), desiredStartDate: z.iso.date(),
  timezone: z.string().refine(isTimezone),
  slots: z.array(z.object({ weekday: z.number().int().min(1).max(7), startsAt: z.string().regex(/^\d{2}:\d{2}$/), endsAt: z.string().regex(/^\d{2}:\d{2}$/) })).min(1).max(14),
});

export async function saveScheduleStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  let payload: unknown;
  try { payload = JSON.parse(String(formData.get("schedule") ?? "{}")); } catch { return { error: "Не удалось прочитать расписание" }; }
  const parsed = scheduleSchema.safeParse(payload);
  if (!parsed.success || parsed.data.slots.some((slot) => slot.startsAt >= slot.endsAt)) return { error: "Проверьте режим и временные интервалы" };
  const { db, user } = await requireIncompleteOnboarding();
  const { error: preferencesError } = await db.from("student_study_preferences").upsert({
    student_id: user.id, weekly_hours: parsed.data.weeklyHours, preferred_format: parsed.data.preferredFormat,
    strict_control: parsed.data.strictControl, daily_reminders: parsed.data.dailyReminders,
    other_courses: parsed.data.otherCourses || null, current_weekly_load: parsed.data.currentWeeklyLoad,
    desired_start_date: parsed.data.desiredStartDate, timezone: parsed.data.timezone, updated_at: new Date().toISOString(),
  });
  if (preferencesError) return { error: "Не удалось сохранить режим" };
  const { error: deleteError } = await db.from("preferred_schedule_slots").delete().eq("student_id", user.id);
  if (deleteError) return { error: "Не удалось обновить интервалы" };
  const { error } = await db.from("preferred_schedule_slots").insert(parsed.data.slots.map((slot) => ({
    student_id: user.id, weekday: slot.weekday, starts_at: slot.startsAt, ends_at: slot.endsAt, timezone: parsed.data.timezone,
  })));
  if (error) return { error: "Не удалось сохранить интервалы" };
  await advance(6);
  redirect("/onboarding/parent");
}

export async function saveParentStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const requested = formData.get("inviteRequested") === "true";
  const parsed = z.object({
    parentName: requested ? z.string().trim().min(2).max(120) : z.string().optional(),
    email: requested ? z.string().email().max(200) : z.string().optional(),
    phone: z.string().trim().max(30).optional(), relation: requested ? z.string().trim().min(2).max(50) : z.string().optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return resultError(parsed.error);
  const { db, user } = await requireIncompleteOnboarding();
  const { error } = await db.from("onboarding_parent_drafts").upsert({
    student_id: user.id, invite_requested: requested, parent_name: requested ? parsed.data.parentName : null,
    email: requested ? parsed.data.email?.toLowerCase() : null, phone: requested ? parsed.data.phone || null : null,
    relation: requested ? parsed.data.relation : null, updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Не удалось сохранить данные родителя" };
  await advance(7);
  redirect("/onboarding/plan");
}

export async function savePlanStep(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const parsed = z.object({ planId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return resultError(parsed.error);
  const { db, user } = await requireIncompleteOnboarding();
  const [{ data: plan }, { count }] = await Promise.all([
    db.from("plans").select("id,plan_subject_limits(max_subjects)").eq("id", parsed.data.planId).eq("active", true).maybeSingle(),
    db.from("student_subjects").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "active"),
  ]);
  const limit = (plan?.plan_subject_limits as unknown as { max_subjects: number } | null)?.max_subjects;
  if (!plan || !limit) return { error: "Тариф недоступен" };
  if ((count ?? 0) > limit) return { error: `В тариф входит не больше ${limit} предметов. Выберите другой тариф или уменьшите число предметов.` };
  const { error } = await db.from("student_onboarding").update({ selected_plan_id: plan.id, current_step: 8, updated_at: new Date().toISOString() }).eq("student_id", user.id);
  if (error) return { error: "Не удалось сохранить тариф" };
  redirect("/onboarding/review");
}

export async function completeOnboarding(_: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const { db, onboarding } = await requireIncompleteOnboarding();
  const idempotencyKey = z.uuid().safeParse(formData.get("idempotencyKey"));
  if (!idempotencyKey.success) return { error: "Обновите страницу и попробуйте ещё раз" };
  const { data: parentDraft } = await db.from("onboarding_parent_drafts").select("invite_requested,email").maybeSingle();
  let token: string | null = null;
  let tokenHash: string | null = null;
  let inviteUrl: string | null = null;
  let mailer: ReturnType<typeof emailService> | null = null;
  if (parentDraft?.invite_requested) {
    token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
    try { tokenHash = await hashInvitationToken(token); } catch { return { error: "Не настроен безопасный ключ приглашений" }; }
    mailer = emailService();
    inviteUrl = `${appUrl()}/invite/parent?token=${token}`;
  }
  const { error } = await db.rpc("complete_student_onboarding", {
    p_idempotency_key: idempotencyKey.data, p_invitation_token_hash: tokenHash,
  });
  if (error) { logError("onboarding.completion.failed", error); return { error: "Анкета не завершена или данные изменились. Проверьте шаги и повторите." }; }
  if (mailer && inviteUrl && parentDraft?.email) {
    try { await mailer.sendParentInvitation({ email: parentDraft.email, inviteUrl }); }
    catch (mailError) { logError("email.parent_invitation.failed", mailError); return { error: "Анкета сохранена, но приглашение родителю не отправлено. Сообщите поддержке." }; }
  }
  if (!onboarding) return { error: "Анкета не найдена" };
  logEvent("onboarding.completed", { parent_invitation: Boolean(parentDraft?.invite_requested) });
  redirect("/student?onboarding=completed");
}
