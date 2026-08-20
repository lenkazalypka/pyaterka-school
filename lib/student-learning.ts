import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { logError } from "@/lib/observability";
import { safeHttpsUrl } from "@/lib/safe-url";
import type {
  StudentEvent,
  StudentAssignment,
  StudentLearningData,
  StudentLesson,
  StudentMaterial,
  StudentRecording,
  StudentTask,
} from "@/types/domain";

type StudentContext = Awaited<ReturnType<typeof requireStudent>>;
type Database = StudentContext["db"];

type ScheduleRow = {
  id: string;
  lesson_id: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  timezone: string;
};

type LessonRow = {
  id: string;
  subject_id: string | null;
  teacher_id: string | null;
  title: string;
  description: string | null;
  status: string;
  objectives: string[] | null;
};

const unique = <T,>(values: T[]) => [...new Set(values)];

async function requireCompletedStudent(): Promise<StudentContext & { name: string; grade: number; timezone: string }> {
  const context = await requireStudent();
  const [{ data: profile }, { data: student }] = await Promise.all([
    context.db.from("profiles").select("first_name,timezone").eq("id", context.user.id).single(),
    context.db.from("student_profiles").select("grade,onboarding_status").eq("user_id", context.user.id).single(),
  ]);
  if (student?.onboarding_status !== "completed") redirect("/onboarding");
  return {
    ...context,
    name: profile?.first_name || "Ученик",
    grade: student.grade || 11,
    timezone: profile?.timezone || "Europe/Moscow",
  };
}

async function loadEvents(db: Database): Promise<ScheduleRow[]> {
  const from = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("schedule_events")
    .select("id,lesson_id,subject_id,title,description,event_type,starts_at,ends_at,status,timezone")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at")
    .limit(200);
  if (error) { logError("rls.query.failed", error, { resource: "schedule_events" }); throw new Error("Не удалось загрузить расписание"); }
  return (data ?? []) as ScheduleRow[];
}

async function loadTasks(db: Database): Promise<StudentTask[]> {
  const { data: assignments, error } = await db
    .from("assignments")
    .select("id,title,due_at,subject_id,status")
    .eq("status", "published")
    .order("due_at")
    .limit(30);
  if (error) { logError("rls.query.failed", error, { resource: "assignments" }); throw new Error("Не удалось загрузить учебные задачи"); }
  const rows = assignments ?? [];
  const subjectIds = unique(rows.map((row) => row.subject_id).filter((id): id is string => Boolean(id)));
  const assignmentIds = rows.map((row) => row.id);
  const [{ data: subjects }, { data: submissions }] = await Promise.all([
    subjectIds.length
      ? db.from("subjects").select("id,name").in("id", subjectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    assignmentIds.length
      ? db.from("assignment_submissions").select("assignment_id,status").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as { assignment_id: string; status: string }[] }),
  ]);
  const subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, subject.name]));
  const submissionMap = new Map((submissions ?? []).map((submission) => [submission.assignment_id, submission.status]));
  const terminal = new Set(["submitted", "under_review", "checked"]);
  return rows
    .filter((row) => !terminal.has(submissionMap.get(row.id) ?? "not_started"))
    .map((row) => ({
      id: row.id,
      title: row.title,
      subject: subjectMap.get(row.subject_id) ?? "Предмет",
      dueAt: row.due_at,
      overdue: new Date(row.due_at).getTime() < Date.now(),
      status: submissionMap.get(row.id) ?? "not_started",
    }));
}

export async function getStudentLearningData(): Promise<StudentLearningData> {
  const generatedAt = new Date().toISOString();
  const context = await requireCompletedStudent();
  const { db, user } = context;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: context.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(generatedAt));
  const todayDate = new Date(`${today}T00:00:00Z`);
  const currentWeekDay = (todayDate.getUTCDay() + 6) % 7;
  todayDate.setUTCDate(todayDate.getUTCDate() - currentWeekDay);
  const weekStartsOn = todayDate.toISOString().slice(0, 10);
  const [eventRows, taskRows, lessonResult, subjectResult, subscriptionResult, progressResult, activityResult, weeklyGoalResult] = await Promise.all([
    loadEvents(db),
    loadTasks(db),
    db.from("lessons").select("id,subject_id,teacher_id,title,description,status,objectives").not("published_at", "is", null).neq("status", "cancelled").order("order_index", { ascending: true, nullsFirst: false }).limit(200),
    db.from("student_subjects").select("id,subject_id,target_score,score_unit").eq("student_id", user.id).eq("status", "active"),
    db.from("subscriptions").select("id,status,price_minor,plans(name,currency)").eq("student_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("student_progress").select("course_id,subject_id,progress_percent,completed_lessons,current_stage,last_activity_at").eq("user_id", user.id),
    db.from("student_activity").select("activity_date,activity_type,points").eq("user_id", user.id).order("activity_date", { ascending: false }).limit(90),
    db.from("student_weekly_goals").select("target_points").eq("user_id", user.id).eq("week_starts_on", weekStartsOn).maybeSingle(),
  ]);
  const stateError = lessonResult.error ?? progressResult.error ?? activityResult.error ?? weeklyGoalResult.error;
  if (stateError) { logError("rls.query.failed", stateError, { resource: "student_learning_state" }); throw new Error("Не удалось загрузить учебный прогресс"); }

  const lessonRows = (lessonResult.data ?? []) as LessonRow[];
  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const { data: lessonProgressRows, error: lessonProgressError } = lessonIds.length
    ? await db.from("student_lesson_progress").select("lesson_id,status,last_position_seconds").in("lesson_id", lessonIds).eq("user_id", user.id)
    : { data: [] as { lesson_id: string; status: "started" | "completed"; last_position_seconds: number | null }[], error: null };
  if (lessonProgressError) { logError("rls.query.failed", lessonProgressError, { resource: "student_lesson_progress" }); throw new Error("Не удалось загрузить прогресс уроков"); }

  const subjectIds = unique([
    ...(subjectResult.data ?? []).map((row) => row.subject_id),
    ...eventRows.map((row) => row.subject_id).filter((id): id is string => Boolean(id)),
    ...lessonRows.map((row) => row.subject_id).filter((id): id is string => Boolean(id)),
  ]);
  const teacherIds = unique(lessonRows.map((row) => row.teacher_id).filter((id): id is string => Boolean(id)));

  const [subjectsResponse, profilesResponse, linksResponse, recordingsResponse, lessonMaterialsResponse] = await Promise.all([
    subjectIds.length ? db.from("subjects").select("id,name").in("id", subjectIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    teacherIds.length ? db.from("profiles").select("id,first_name,last_name").in("id", teacherIds) : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    lessonIds.length ? db.from("meeting_links").select("lesson_id,join_url").in("lesson_id", lessonIds) : Promise.resolve({ data: [] as { lesson_id: string; join_url: string }[] }),
    lessonIds.length ? db.from("lesson_recordings").select("id,lesson_id,title,duration_seconds,storage_path,external_url").in("lesson_id", lessonIds).eq("status", "published").order("published_at", { ascending: false }) : Promise.resolve({ data: [] as { id: string; lesson_id: string; title: string | null; duration_seconds: number | null; storage_path: string | null; external_url: string | null }[] }),
    lessonIds.length ? db.from("lesson_materials").select("lesson_id,material_id,position").in("lesson_id", lessonIds).order("position") : Promise.resolve({ data: [] as { lesson_id: string; material_id: string; position: number }[] }),
  ]);

  const { data: assignmentRows, error: assignmentsError } = lessonIds.length
    ? await db.from("assignments").select("id,lesson_id,title,description,due_at,max_score").in("lesson_id", lessonIds).eq("status", "published").order("due_at")
    : { data: [] as { id: string; lesson_id: string; title: string; description: string | null; due_at: string; max_score: number }[], error: null };
  if (assignmentsError) { logError("rls.query.failed", assignmentsError, { resource: "lesson_assignments" }); throw new Error("Не удалось загрузить домашние задания"); }
  const assignmentIdsForLessons = (assignmentRows ?? []).map((assignment) => assignment.id);
  const { data: submissionRows, error: submissionsError } = assignmentIdsForLessons.length
    ? await db.from("assignment_submissions").select("assignment_id,status,answer,score,reviewed_at").in("assignment_id", assignmentIdsForLessons).eq("student_id", user.id)
    : { data: [] as { assignment_id: string; status: string; answer: unknown; score: number | null; reviewed_at: string | null }[], error: null };
  if (submissionsError) { logError("rls.query.failed", submissionsError, { resource: "assignment_submissions" }); throw new Error("Не удалось загрузить ответы на задания"); }
  const { data: assignmentQuestionRows, error: assignmentQuestionsError } = assignmentIdsForLessons.length
    ? await db.from("assignment_questions").select("assignment_id,question_id,position").in("assignment_id", assignmentIdsForLessons).order("position")
    : { data: [] as { assignment_id: string; question_id: string; position: number }[], error: null };
  if (assignmentQuestionsError) { logError("rls.query.failed", assignmentQuestionsError, { resource: "assignment_questions" }); throw new Error("Не удалось загрузить задания из банка"); }
  const questionIds = unique((assignmentQuestionRows ?? []).map((link) => link.question_id));
  const { data: questionRows, error: questionsError } = questionIds.length
    ? await db.from("question_bank").select("id,prompt,difficulty,topic_id").in("id", questionIds).eq("status", "published")
    : { data: [] as { id: string; prompt: string; difficulty: number; topic_id: string | null }[], error: null };
  if (questionsError) { logError("rls.query.failed", questionsError, { resource: "question_bank" }); throw new Error("Не удалось загрузить условия заданий"); }
  const questionTopicIds = unique((questionRows ?? []).map((question) => question.topic_id).filter((id): id is string => Boolean(id)));
  const { data: questionTopics } = questionTopicIds.length
    ? await db.from("topics").select("id,title").in("id", questionTopicIds)
    : { data: [] as { id: string; title: string }[] };

  const materialIds = unique((lessonMaterialsResponse.data ?? []).map((row) => row.material_id));
  const { data: materialRows } = materialIds.length
    ? await db.from("materials").select("id,title,description,material_type,mime_type,file_size_bytes").in("id", materialIds).order("title")
    : { data: [] as { id: string; title: string; description: string | null; material_type: string; mime_type: string | null; file_size_bytes: number | null }[] };

  const subjectMap = new Map((subjectsResponse.data ?? []).map((subject) => [subject.id, subject.name]));
  const profileMap = new Map((profilesResponse.data ?? []).map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()]));
  const linkMap = new Map((linksResponse.data ?? []).map((link) => [link.lesson_id, safeHttpsUrl(link.join_url)]));
  const eventByLesson = new Map(eventRows.filter((row) => row.lesson_id).map((row) => [row.lesson_id as string, row]));
  const materialMap = new Map((materialRows ?? []).map((material) => [material.id, material]));

  const events: StudentEvent[] = eventRows.map((row) => {
    const lesson = lessonRows.find((item) => item.id === row.lesson_id);
    return {
      id: row.id,
      lessonId: row.lesson_id,
      title: row.title,
      description: row.description,
      eventType: row.event_type,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      timezone: row.timezone,
      subject: subjectMap.get(row.subject_id ?? lesson?.subject_id ?? "") ?? null,
      teacher: lesson?.teacher_id ? profileMap.get(lesson.teacher_id) ?? null : null,
      joinUrl: row.lesson_id ? linkMap.get(row.lesson_id) ?? null : null,
    };
  });
  const eventMap = new Map(events.filter((event) => event.lessonId).map((event) => [event.lessonId as string, event]));

  const materialsByLesson = new Map<string, StudentMaterial[]>();
  for (const link of lessonMaterialsResponse.data ?? []) {
    const material = materialMap.get(link.material_id);
    if (!material) continue;
    const item: StudentMaterial = {
      id: material.id,
      lessonId: link.lesson_id,
      title: material.title,
      description: material.description,
      materialType: material.material_type,
      mimeType: material.mime_type,
      fileSizeBytes: material.file_size_bytes,
      downloadUrl: `/api/materials/${material.id}`,
    };
    materialsByLesson.set(link.lesson_id, [...(materialsByLesson.get(link.lesson_id) ?? []), item]);
  }

  const recordingByLesson = new Map<string, StudentRecording>();
  for (const recording of recordingsResponse.data ?? []) {
    if (recordingByLesson.has(recording.lesson_id)) continue;
    const sourceType = recording.storage_path ? "private_storage" : safeHttpsUrl(recording.external_url) ? "external" : null;
    if (!sourceType) continue;
    recordingByLesson.set(recording.lesson_id, {
      id: recording.id,
      lessonId: recording.lesson_id,
      title: recording.title || "Запись занятия",
      durationSeconds: recording.duration_seconds,
      watchUrl: `/api/recordings/${recording.id}`,
      sourceType,
    });
  }

  const topicNameMap = new Map((questionTopics ?? []).map((topic) => [topic.id, topic.title]));
  const questionMap = new Map((questionRows ?? []).map((question) => [question.id, question]));
  const submissionMap = new Map((submissionRows ?? []).map((submission) => [submission.assignment_id, submission]));
  const assignmentsByLesson = new Map<string, StudentAssignment[]>();
  for (const assignment of assignmentRows ?? []) {
    const questions = (assignmentQuestionRows ?? [])
      .filter((link) => link.assignment_id === assignment.id)
      .map((link) => questionMap.get(link.question_id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question))
      .map((question) => ({
        id: question.id,
        prompt: question.prompt,
        difficulty: question.difficulty,
        topic: question.topic_id ? topicNameMap.get(question.topic_id) ?? null : null,
      }));
    const item: StudentAssignment = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.due_at,
      maxScore: Number(assignment.max_score),
      questions,
      submission: submissionMap.has(assignment.id) ? {
        status: submissionMap.get(assignment.id)?.status ?? "not_started",
        answer: typeof (submissionMap.get(assignment.id)?.answer as { text?: unknown } | null)?.text === "string"
          ? String((submissionMap.get(assignment.id)?.answer as { text: string }).text)
          : "",
        score: submissionMap.get(assignment.id)?.score === null || submissionMap.get(assignment.id)?.score === undefined ? null : Number(submissionMap.get(assignment.id)?.score),
        checkedAt: submissionMap.get(assignment.id)?.reviewed_at ?? null,
      } : null,
    };
    assignmentsByLesson.set(assignment.lesson_id, [...(assignmentsByLesson.get(assignment.lesson_id) ?? []), item]);
  }

  const lessonProgressMap = new Map((lessonProgressRows ?? []).map((progress) => [progress.lesson_id, progress]));
  const lessons: StudentLesson[] = lessonRows
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      status: lesson.status,
      objectives: lesson.objectives ?? [],
      subject: subjectMap.get(lesson.subject_id ?? "") ?? "Предмет",
      teacher: lesson.teacher_id ? profileMap.get(lesson.teacher_id) ?? null : null,
      event: eventMap.get(lesson.id) ?? null,
      materials: materialsByLesson.get(lesson.id) ?? [],
      recording: recordingByLesson.get(lesson.id) ?? null,
      assignments: assignmentsByLesson.get(lesson.id) ?? [],
      progressStatus: lessonProgressMap.get(lesson.id)?.status ?? null,
      progressPositionSeconds: lessonProgressMap.get(lesson.id)?.last_position_seconds ?? null,
    }))
    .sort((left, right) => {
      const leftDate = eventByLesson.get(left.id)?.starts_at ?? "";
      const rightDate = eventByLesson.get(right.id)?.starts_at ?? "";
      return rightDate.localeCompare(leftDate);
    });

  const subjectNameMap = subjectMap;
  const subjects = (subjectResult.data ?? []).map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    name: subjectNameMap.get(row.subject_id) ?? "Предмет",
    target: row.target_score,
    scoreUnit: row.score_unit as "test_score" | "primary_score",
  }));
  const subscription = subscriptionResult.data;
  const activityDates = new Set((activityResult.data ?? []).map((row) => row.activity_date));
  const localDate = (offsetDays: number) => {
    const date = new Date(Date.now() + offsetDays * 86400000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: context.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  };
  let streakOffset = activityDates.has(localDate(0)) ? 0 : -1;
  let streakDays = 0;
  while (activityDates.has(localDate(streakOffset))) { streakDays += 1; streakOffset -= 1; }
  const weeklyDates = new Set(Array.from({ length: currentWeekDay + 1 }, (_, index) => localDate(-index)));
  const weeklyPoints = (activityResult.data ?? []).reduce((total, row) => total + (weeklyDates.has(row.activity_date) ? Number(row.points) : 0), 0);
  const activityTypes = new Set((activityResult.data ?? []).map((row) => row.activity_type));
  const achievements = [
    activityTypes.has("diagnostic_completed") ? "Диагностика пройдена" : null,
    activityTypes.has("lesson_completed") ? "Первый урок пройден" : null,
    activityTypes.has("homework_submitted") ? "Первое задание отправлено" : null,
  ].filter((achievement): achievement is string => Boolean(achievement));

  return {
    generatedAt,
    identity: { id: user.id, name: context.name, grade: context.grade, timezone: context.timezone },
    subjects,
    subscription: subscription
      ? {
          id: subscription.id,
          planName: (subscription.plans as unknown as { name: string; currency: string } | null)?.name ?? "Тариф",
          status: subscription.status,
          priceMinor: subscription.price_minor,
          currency: (subscription.plans as unknown as { name: string; currency: string } | null)?.currency ?? "RUB",
        }
      : null,
    events,
    lessons,
    tasks: taskRows,
    progress: (progressResult.data ?? []).map((progress) => ({
      courseId: progress.course_id, subjectId: progress.subject_id, percent: Number(progress.progress_percent),
      completedLessons: progress.completed_lessons, currentStage: progress.current_stage, lastActivityAt: progress.last_activity_at,
    })),
    activity: { streakDays, weeklyPoints, weeklyGoalPoints: weeklyGoalResult.data?.target_points ?? null, achievements },
  };
}

export async function getStudentLesson(lessonId: string): Promise<{ identity: StudentLearningData["identity"]; lesson: StudentLesson }> {
  const data = await getStudentLearningData();
  const lesson = data.lessons.find((item) => item.id === lessonId);
  if (!lesson) redirect("/student/lessons");
  return { identity: data.identity, lesson };
}
