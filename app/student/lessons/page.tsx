import { ArrowRight, BookOpen, CalendarDays, FileText, PlayCircle } from "lucide-react";
import Link from "next/link";
import { eventDate, eventTime } from "@/components/student-event-card";
import { StudentShell } from "@/components/student-shell";
import { getStudentLearningData } from "@/lib/student-learning";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  scheduled: "Запланирован",
  live: "Идёт сейчас",
  completed: "Завершён",
  recording_processing: "Запись обрабатывается",
  recording_published: "Запись опубликована",
  cancelled: "Отменён",
};

export default async function StudentLessonsPage() {
  const data = await getStudentLearningData();
  return <StudentShell identity={data.identity} active="lessons">
    <div className="student-page">
      <header className="student-page-heading"><div><span className="student-eyebrow">Только ваши группы и активные предметы</span><h1>Уроки и материалы</h1><p>Здесь появляются темы занятий, конспекты и опубликованные записи. Недоступные или неоплаченные предметы не отображаются.</p></div></header>
      {data.lessons.length ? <div className="student-lessons-grid">{data.lessons.map((lesson) => <article className="student-lesson-card" key={lesson.id}>
        <div className="student-lesson-card-top"><span>{lesson.subject}</span><small>{statusLabels[lesson.status] ?? lesson.status}</small></div>
        <h2>{lesson.title}</h2>
        {lesson.description && <p>{lesson.description}</p>}
        <div className="student-lesson-meta">
          {lesson.event && <span><CalendarDays aria-hidden="true" />{eventDate(lesson.event.startsAt, data.identity.timezone)}, {eventTime(lesson.event.startsAt, data.identity.timezone)}</span>}
          {lesson.recording && <span><PlayCircle aria-hidden="true" />Есть запись</span>}
          {lesson.materials.length > 0 && <span><FileText aria-hidden="true" />Материалов: {lesson.materials.length}</span>}
        </div>
        <Link href={`/student/lessons/${lesson.id}`}>Открыть урок <ArrowRight aria-hidden="true" /></Link>
      </article>)}</div> : <div className="student-empty student-empty-page"><BookOpen aria-hidden="true" /><b>Уроков пока нет</b><p>После назначения группы и публикации урока он появится здесь без демонстрационных подстановок.</p></div>}
    </div>
  </StudentShell>;
}
