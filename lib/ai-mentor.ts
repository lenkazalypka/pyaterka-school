import "server-only";
import { mentorMessagesSchema, type MentorMessage } from "@/lib/ai-contract";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";

type StudentContext = Awaited<ReturnType<typeof requireStudent>>;

export async function getStudentAiContext(studentContext?: StudentContext) {
  const { db, user } = studentContext ?? await requireStudent();
  const [progress, subjects, goals, diagnostics, submissions] = await Promise.all([
    db.from("student_progress").select("subject_id,course_id,progress_percent,completed_lessons,current_stage,recommendations,last_activity_at").eq("user_id", user.id).limit(20),
    db.from("student_subjects").select("subject_id,current_grade,confidence,target_score,weak_topics,subjects(name)").eq("student_id", user.id).eq("status", "active").limit(12),
    db.from("admission_goals").select("institution_type,direction_name,desired_score,priority,status").eq("student_id", user.id).eq("status", "active").order("priority").limit(5),
    db.from("diagnostics").select("subject,result,weak_topics,recommendations,next_step,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    db.from("assignment_submissions").select("assignment_id,status,score,reviewed_at").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(30),
  ]);
  const failed = [progress, subjects, goals, diagnostics, submissions].find((response) => response.error);
  if (failed?.error) {
    logError("ai.context.failed", failed.error);
    throw new Error("Не удалось собрать учебный контекст");
  }
  return {
    progress: progress.data ?? [],
    subjects: subjects.data ?? [],
    goals: goals.data ?? [],
    diagnostics: diagnostics.data ?? [],
    homeworkOutcomes: submissions.data ?? [],
  };
}

export async function getStudentAiPageData() {
  const context = await requireStudent();
  const { db, user } = context;
  const [profileResult, studentResult, conversationResult] = await Promise.all([
    db.from("profiles").select("first_name,last_name,timezone").eq("id", user.id).single(),
    db.from("student_profiles").select("grade").eq("user_id", user.id).single(),
    db.from("ai_conversations").select("id,messages,created_at,updated_at").eq("user_id", user.id).gt("expires_at", new Date().toISOString()).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const failed = [profileResult, studentResult, conversationResult].find((response) => response.error);
  if (failed?.error) {
    logError("ai.page.failed", failed.error);
    throw new Error("Не удалось загрузить AI-наставника");
  }
  const parsedMessages = conversationResult.data
    ? mentorMessagesSchema.safeParse(conversationResult.data.messages)
    : null;
  const messages: MentorMessage[] = parsedMessages?.success ? parsedMessages.data : [];
  return {
    identity: {
      id: user.id,
      name: `${profileResult.data?.first_name ?? ""} ${profileResult.data?.last_name ?? ""}`.trim() || "Ученик",
      grade: studentResult.data?.grade ?? 9,
      timezone: profileResult.data?.timezone ?? "Europe/Moscow",
    },
    conversation: conversationResult.data ? { id: conversationResult.data.id, messages } : null,
  };
}
