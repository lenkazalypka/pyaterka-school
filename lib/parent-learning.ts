import { requireRole } from "@/lib/auth";
import { logError } from "@/lib/observability";

export type ParentProgress = {
  studentId: string;
  studentName: string;
  grade: number | null;
  progressPercent: number;
  completedLessons: number;
  currentStage: string | null;
  recommendations: string[];
  lastActivityAt: string | null;
  attendanceTotal: number;
  attendedLessons: number;
  homeworkTotal: number;
  homeworkCompleted: number;
};

export async function getParentProgress(): Promise<ParentProgress[]> {
  const { db } = await requireRole("parent");
  const { data, error } = await db.from("parent_progress_view").select("student_id,student_name,grade,progress_percent,completed_lessons,current_stage,recommendations,last_activity_at,attendance_total,attended_lessons,homework_total,homework_completed");
  if (error) {
    logError("parent.progress.failed", error);
    throw new Error("Не удалось загрузить учебные данные");
  }
  return (data ?? []).map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name || "Ученик",
    grade: row.grade,
    progressPercent: Number(row.progress_percent),
    completedLessons: Number(row.completed_lessons),
    currentStage: row.current_stage,
    recommendations: row.recommendations ?? [],
    lastActivityAt: row.last_activity_at,
    attendanceTotal: Number(row.attendance_total),
    attendedLessons: Number(row.attended_lessons),
    homeworkTotal: Number(row.homework_total),
    homeworkCompleted: Number(row.homework_completed),
  }));
}
