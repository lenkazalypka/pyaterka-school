import { Brand } from "@/components/brand";
import { getParentProgress } from "@/lib/parent-learning";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const students = await getParentProgress();
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
    <Brand />
    <header className="mt-10 max-w-3xl"><span className="student-eyebrow">Кабинет родителя</span><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Учебная картина без лишнего контроля</h1><p className="mt-4 text-[var(--text-muted)]">Здесь только подтверждённые учебные факты. Личные ответы и диалоги с AI-ментором недоступны.</p></header>
    {students.length ? <section className="mt-10 grid gap-5">{students.map((student) => <article className="card p-5 sm:p-7" key={student.studentId}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><small className="student-eyebrow">{student.grade ? `${student.grade} класс` : "Класс не указан"}</small><h2 className="mt-2 text-2xl font-extrabold">{student.studentName}</h2></div><strong className="text-3xl text-[var(--brand-primary)]">{student.progressPercent}%</strong></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-black/5 p-4"><small>Пройдено уроков</small><b className="mt-1 block text-xl">{student.completedLessons}</b></div><div className="rounded-2xl bg-black/5 p-4"><small>Посещаемость</small><b className="mt-1 block text-xl">{student.attendedLessons}/{student.attendanceTotal}</b></div><div className="rounded-2xl bg-black/5 p-4"><small>Домашние задания</small><b className="mt-1 block text-xl">{student.homeworkCompleted}/{student.homeworkTotal}</b></div><div className="rounded-2xl bg-black/5 p-4"><small>Последняя активность</small><b className="mt-1 block text-sm">{student.lastActivityAt ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(student.lastActivityAt)) : "Пока нет"}</b></div></div>
      {student.currentStage && <p className="mt-5"><b>Следующий шаг:</b> {student.currentStage}</p>}
      {student.recommendations.length > 0 && <div className="mt-4"><b>Рекомендации</b><ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--text-muted)]">{student.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul></div>}
    </article>)}</section> : <section className="card mt-10 p-7"><h2 className="text-xl font-extrabold">Связанных учеников пока нет</h2><p className="mt-2 text-[var(--text-muted)]">Данные появятся после того, как ученик примет приглашение и связь получит статус confirmed.</p></section>}
  </main>;
}
