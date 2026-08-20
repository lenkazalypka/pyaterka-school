import "server-only";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";

export async function getStudentAiContext() {
  const { db, user } = await requireStudent();
  const [progress, subjects, goals, diagnostics, submissions] = await Promise.all([
    db.from("student_progress").select("subject_id,course_id,progress_percent,completed_lessons,current_stage,recommendations,last_activity_at").eq("user_id", user.id),
    db.from("student_subjects").select("subject_id,current_grade,confidence,target_score,weak_topics,subjects(name)").eq("student_id", user.id).eq("status", "active"),
    db.from("admission_goals").select("institution_type,institution_name,direction_name,desired_score,priority,status").eq("student_id", user.id).eq("status", "active").order("priority"),
    db.from("diagnostics").select("subject,result,weak_topics,recommendations,next_step,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    db.from("assignment_submissions").select("assignment_id,status,score,reviewed_at").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(30),
  ]);
  const failed = [progress, subjects, goals, diagnostics, submissions].find((response) => response.error);
  if (failed?.error) {
    logError("ai.context.failed", failed.error);
    throw new Error("Не удалось собрать учебный контекст");
  }
  return {
    userId: user.id,
    progress: progress.data ?? [],
    subjects: subjects.data ?? [],
    goals: goals.data ?? [],
    diagnostics: diagnostics.data ?? [],
    homeworkOutcomes: submissions.data ?? [],
  };
}
