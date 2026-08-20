import { ArrowLeft, CalendarDays, Check, ClipboardCheck, Download, ExternalLink, FileText, PlayCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { eventDate, eventTime } from "@/components/student-event-card";
import { StudentShell } from "@/components/student-shell";
import { CompleteLessonForm, HomeworkSubmissionForm } from "@/components/student-learning-actions";
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

function deadline(value: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

export default async function StudentLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { identity, lesson } = await getStudentLesson(lessonId);
  return <StudentShell identity={identity} active="lessons">
    <div className="student-page student-lesson-page">
      <Link className="student-back" href="/student/lessons"><ArrowLeft aria-hidden="true" />Все уроки</Link>
      <header className="student-lesson-hero"><span>{lesson.subject}</span><h1>{lesson.title}</h1>{lesson.description && <p>{lesson.description}</p>}<div>{lesson.event && <span><CalendarDays aria-hidden="true" />{eventDate(lesson.event.startsAt, identity.timezone)}, {eventTime(lesson.event.startsAt, identity.timezone)}</span>}{lesson.teacher && <span><UserRound aria-hidden="true" />{lesson.teacher}</span>}</div>{lesson.event?.joinUrl && <a className="button button-primary" href={lesson.event.joinUrl} target="_blank" rel="noreferrer">Подключиться <ExternalLink aria-hidden="true" /></a>}<CompleteLessonForm lessonId={lesson.id} completed={lesson.progressStatus === "completed"} /></header>

      <div className="student-lesson-layout">
        <div>
          <section className="student-detail-card"><div className="student-card-heading"><div><small>После занятия</small><h2>Запись</h2></div><PlayCircle aria-hidden="true" /></div>{lesson.recording ? <div className="student-recording"><PlayCircle aria-hidden="true" /><div><b>{lesson.recording.title}</b>{duration(lesson.recording.durationSeconds) && <small>{duration(lesson.recording.durationSeconds)}</small>}</div><a className="button button-primary button-small" href={lesson.recording.watchUrl} target="_blank" rel="noreferrer">Смотреть</a></div> : <div className="student-empty"><PlayCircle aria-hidden="true" /><b>Запись ещё не опубликована</b><p>Если урок уже прошёл, запись появится после загрузки преподавателем или администратором.</p></div>}</section>
          <section className="student-detail-card"><div className="student-card-heading"><div><small>К уроку</small><h2>Материалы</h2></div><FileText aria-hidden="true" /></div>{lesson.materials.length ? <div className="student-material-list">{lesson.materials.map((material) => <a href={material.downloadUrl} target="_blank" rel="noreferrer" key={material.id}><span><FileText aria-hidden="true" /></span><div><b>{material.title}</b><small>{[material.materialType.toUpperCase(), fileSize(material.fileSizeBytes)].filter(Boolean).join(" · ")}</small></div><Download aria-hidden="true" /></a>)}</div> : <div className="student-empty"><FileText aria-hidden="true" /><b>Материалов пока нет</b><p>Файлы появятся после публикации преподавателем.</p></div>}</section>
          <section className="student-detail-card"><div className="student-card-heading"><div><small>После урока</small><h2>Домашнее задание</h2></div><ClipboardCheck aria-hidden="true" /></div>{lesson.assignments.length ? <div className="space-y-5">{lesson.assignments.map((assignment) => <article className="rounded-2xl border border-[var(--border-soft)] p-5" key={assignment.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">{assignment.title}</h3><p className="mt-1 text-sm text-[var(--brand-primary)]">Сдать до {deadline(assignment.dueAt, identity.timezone)} · максимум {assignment.maxScore} б.</p></div></div>{assignment.description && <p className="mt-4 text-[var(--text-muted)]">{assignment.description}</p>}{assignment.questions.length > 0 && <ol className="mt-5 space-y-3">{assignment.questions.map((question, index) => <li className="rounded-xl bg-black/5 p-4" key={question.id}><small className="font-bold text-[var(--text-muted)]">Задание {index + 1}{question.topic ? ` · ${question.topic}` : ""} · сложность {question.difficulty}/3</small><p className="mt-2 font-medium">{question.prompt}</p></li>)}</ol>}<HomeworkSubmissionForm assignmentId={assignment.id} lessonId={lesson.id} answer={assignment.submission?.answer ?? ""} status={assignment.submission?.status ?? null} />{assignment.submission?.score !== null && assignment.submission?.score !== undefined && <p className="mt-3 text-sm font-bold">Оценка: {assignment.submission.score} из {assignment.maxScore}</p>}</article>)}</div> : <div className="student-empty"><ClipboardCheck aria-hidden="true" /><b>ДЗ пока нет</b><p>Если преподаватель добавит задание к уроку, оно появится здесь вместе с дедлайном.</p></div>}</section>
        </div>
        <aside className="student-objectives"><small>Цели урока</small>{lesson.objectives.length ? <ul>{lesson.objectives.map((objective) => <li key={objective}><Check aria-hidden="true" />{objective}</li>)}</ul> : <p>Преподаватель пока не добавил цели урока.</p>}</aside>
      </div>
    </div>
  </StudentShell>;
}
