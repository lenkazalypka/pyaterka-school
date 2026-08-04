import { ArrowLeft, CalendarDays, Check, Download, ExternalLink, FileText, PlayCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { eventDate, eventTime } from "@/components/student-event-card";
import { StudentShell } from "@/components/student-shell";
import { getStudentLesson } from "@/lib/student-learning";

export const dynamic = "force-dynamic";

function fileSize(value: number | null) {
  if (value === null) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

function duration(value: number | null) {
  if (!value) return null;
  const minutes = Math.round(value / 60);
  return `${minutes} мин`;
}

export default async function StudentLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { identity, lesson } = await getStudentLesson(lessonId);
  return <StudentShell identity={identity} active="lessons">
    <div className="student-page student-lesson-page">
      <Link className="student-back" href="/student/lessons"><ArrowLeft aria-hidden="true" />Все уроки</Link>
      <header className="student-lesson-hero"><span>{lesson.subject}</span><h1>{lesson.title}</h1>{lesson.description && <p>{lesson.description}</p>}<div>{lesson.event && <span><CalendarDays aria-hidden="true" />{eventDate(lesson.event.startsAt, identity.timezone)}, {eventTime(lesson.event.startsAt, identity.timezone)}</span>}{lesson.teacher && <span><UserRound aria-hidden="true" />{lesson.teacher}</span>}</div>{lesson.event?.joinUrl && <a className="button button-primary" href={lesson.event.joinUrl} target="_blank" rel="noreferrer">Подключиться <ExternalLink aria-hidden="true" /></a>}</header>

      <div className="student-lesson-layout">
        <div>
          <section className="student-detail-card"><div className="student-card-heading"><div><small>После занятия</small><h2>Запись</h2></div><PlayCircle aria-hidden="true" /></div>{lesson.recording ? <div className="student-recording"><PlayCircle aria-hidden="true" /><div><b>{lesson.recording.title}</b>{duration(lesson.recording.durationSeconds) && <small>{duration(lesson.recording.durationSeconds)}</small>}</div><a className="button button-primary button-small" href={lesson.recording.watchUrl} target="_blank" rel="noreferrer">Смотреть</a></div> : <div className="student-empty"><PlayCircle aria-hidden="true" /><b>Запись ещё не опубликована</b><p>Если урок уже прошёл, запись появится после загрузки преподавателем или администратором.</p></div>}</section>
          <section className="student-detail-card"><div className="student-card-heading"><div><small>К уроку</small><h2>Материалы</h2></div><FileText aria-hidden="true" /></div>{lesson.materials.length ? <div className="student-material-list">{lesson.materials.map((material) => <a href={material.downloadUrl} target="_blank" rel="noreferrer" key={material.id}><span><FileText aria-hidden="true" /></span><div><b>{material.title}</b><small>{[material.materialType.toUpperCase(), fileSize(material.fileSizeBytes)].filter(Boolean).join(" · ")}</small></div><Download aria-hidden="true" /></a>)}</div> : <div className="student-empty"><FileText aria-hidden="true" /><b>Материалов пока нет</b><p>Файлы появятся после публикации преподавателем.</p></div>}</section>
        </div>
        <aside className="student-objectives"><small>Цели урока</small>{lesson.objectives.length ? <ul>{lesson.objectives.map((objective) => <li key={objective}><Check aria-hidden="true" />{objective}</li>)}</ul> : <p>Преподаватель пока не добавил цели урока.</p>}</aside>
      </div>
    </div>
  </StudentShell>;
}
