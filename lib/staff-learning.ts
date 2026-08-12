import { requireAnyRole } from "@/lib/auth";
import { logError } from "@/lib/observability";

export async function getStaffLearningEditorData() {
  const context = await requireAnyRole(["teacher", "curator"]);
  const { db } = context;
  const [groupsResult, teachersResult, programsResult, subjectsResult, modulesResult, topicsResult, questionsResult, answersResult, lessonsResult] = await Promise.all([
    db.from("groups").select("id,name,timezone,program_id").eq("status", "active").order("name"),
    db.from("group_teachers").select("group_id,teacher_id"),
    db.from("programs").select("id,subject_id,title"),
    db.from("subjects").select("id,name").eq("active", true).order("name"),
    db.from("modules").select("id,program_id"),
    db.from("topics").select("id,module_id,title").order("position"),
    db.from("question_bank").select("id,subject_id,topic_id,prompt,difficulty,status,author_id").neq("status", "archived").order("updated_at", { ascending: false }),
    db.from("question_answers").select("question_id,answer"),
    db.from("lessons").select("id,group_id,subject_id,title,status,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const failure = [groupsResult, teachersResult, programsResult, subjectsResult, modulesResult, topicsResult, questionsResult, answersResult, lessonsResult].find((result) => result.error);
  if (failure?.error) {
    logError("rls.query.failed", failure.error, { resource: "staff_learning_editor" });
    throw new Error("Не удалось загрузить редактор");
  }

  const teacherIds = [...new Set((teachersResult.data ?? []).map((row) => row.teacher_id))];
  const { data: teacherProfiles, error: profilesError } = teacherIds.length
    ? await db.from("profiles").select("id,first_name,last_name").in("id", teacherIds)
    : { data: [], error: null };
  if (profilesError) {
    logError("rls.query.failed", profilesError, { resource: "teacher_profiles" });
    throw new Error("Не удалось загрузить преподавателей");
  }

  const programMap = new Map((programsResult.data ?? []).map((program) => [program.id, program]));
  const subjectMap = new Map((subjectsResult.data ?? []).map((subject) => [subject.id, subject.name]));
  const moduleMap = new Map((modulesResult.data ?? []).map((module) => [module.id, module.program_id]));
  const profileMap = new Map((teacherProfiles ?? []).map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()]));
  const groupMap = new Map((groupsResult.data ?? []).map((group) => [group.id, group.name]));
  const answerMap = new Map((answersResult.data ?? []).map((answer) => [answer.question_id, answer.answer]));

  return {
    identity: { id: context.user.id, roles: context.roles },
    groups: (groupsResult.data ?? []).map((group) => {
      const program = programMap.get(group.program_id);
      return {
        id: group.id,
        name: group.name,
        timezone: group.timezone,
        subjectId: program?.subject_id ?? "",
        subjectName: subjectMap.get(program?.subject_id ?? "") ?? "Предмет",
        teachers: (teachersResult.data ?? [])
          .filter((link) => link.group_id === group.id)
          .map((link) => ({ id: link.teacher_id, name: profileMap.get(link.teacher_id) ?? "Преподаватель" })),
      };
    }).filter((group) => group.subjectId && group.teachers.length),
    subjects: (subjectsResult.data ?? []).map((subject) => ({ id: subject.id, name: subject.name })),
    topics: (topicsResult.data ?? []).flatMap((topic) => {
      const program = programMap.get(moduleMap.get(topic.module_id) ?? "");
      return program ? [{ id: topic.id, title: topic.title, subjectId: program.subject_id }] : [];
    }),
    questions: (questionsResult.data ?? []).map((question) => ({ ...question, answer: answerMap.get(question.id) ?? "" })),
    lessons: (lessonsResult.data ?? []).map((lesson) => ({
      ...lesson,
      groupName: groupMap.get(lesson.group_id) ?? "Группа",
      subjectName: subjectMap.get(lesson.subject_id) ?? "Предмет",
    })),
  };
}
