import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { safeHttpsUrl } from "@/lib/safe-url";
import type {
  StudentEvent,
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
  if (error) throw new Error("Не удалось загрузить расписание");
  return (data ?? []) as ScheduleRow[];
}

async function loadTasks(db: Database): Promise<StudentTask[]> {
  const { data: assignments, error } = await db
    .from("assignments")
    .select("id,title,due_at,subject_id,status")
    .eq("status", "published")
    .order("due_at")
    .limit(30);
  if (error) throw new Error("Не удалось загрузить учебные задачи");
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
  const [eventRows, taskRows, subjectResult, subscriptionResult] = await Promise.all([
    loadEvents(db),
    loadTasks(db),
    db.from("student_subjects").select("id,subject_id,target_score,score_unit").eq("student_id", user.id).eq("status", "active"),
    db.from("subscriptions").select("status,plans(name)").eq("student_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const lessonIds = unique(eventRows.map((event) => event.lesson_id).filter((id): id is string => Boolean(id)));
  const { data: lessonData, error: lessonError } = lessonIds.length
    ? await db.from("lessons").select("id,subject_id,teacher_id,title,description,status,objectives").in("id", lessonIds)
    : { data: [] as LessonRow[], error: null };
  if (lessonError) throw new Error("Не удалось загрузить уроки");
  const lessonRows = (lessonData ?? []) as LessonRow[];

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
    lessonIds.length ? db.from("lesson_recordings").select("id,lesson_id,title,duration_seconds").in("lesson_id", lessonIds).eq("status", "published").order("published_at", { ascending: false }) : Promise.resolve({ data: [] as { id: string; lesson_id: string; title: string | null; duration_seconds: number | null }[] }),
    lessonIds.length ? db.from("lesson_materials").select("lesson_id,material_id,position").in("lesson_id", lessonIds).order("position") : Promise.resolve({ data: [] as { lesson_id: string; material_id: string; position: number }[] }),
  ]);

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
    recordingByLesson.set(recording.lesson_id, {
      id: recording.id,
      lessonId: recording.lesson_id,
      title: recording.title || "Запись занятия",
      durationSeconds: recording.duration_seconds,
      watchUrl: `/api/recordings/${recording.id}`,
    });
  }

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
    }))
    .sort((left, right) => {
      const leftDate = eventByLesson.get(left.id)?.starts_at ?? "";
      const rightDate = eventByLesson.get(right.id)?.starts_at ?? "";
      return rightDate.localeCompare(leftDate);
    });

  const subjectNameMap = subjectMap;
  const subjects = (subjectResult.data ?? []).map((row) => ({
    id: row.id,
    name: subjectNameMap.get(row.subject_id) ?? "Предмет",
    target: row.target_score,
    scoreUnit: row.score_unit as "test_score" | "primary_score",
  }));
  const subscription = subscriptionResult.data;

  return {
    generatedAt,
    identity: { id: user.id, name: context.name, grade: context.grade, timezone: context.timezone },
    subjects,
    subscription: subscription
      ? { planName: (subscription.plans as unknown as { name: string } | null)?.name ?? "Тариф", status: subscription.status }
      : null,
    events,
    lessons,
    tasks: taskRows,
  };
}

export async function getStudentLesson(lessonId: string): Promise<{ identity: StudentLearningData["identity"]; lesson: StudentLesson }> {
  const data = await getStudentLearningData();
  const lesson = data.lessons.find((item) => item.id === lessonId);
  if (!lesson) redirect("/student/lessons");
  return { identity: data.identity, lesson };
}
