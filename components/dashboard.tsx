import { AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, Target } from "lucide-react";
import Link from "next/link";
import { StudentEventCard, eventTime, isEventToday } from "@/components/student-event-card";
import { StudentShell } from "@/components/student-shell";
import { StudentWeeklyGoal } from "@/components/student-weekly-goal";
import { beginSubscriptionPayment } from "@/app/student/payment/actions";
import type { StudentLearningData } from "@/types/domain";

const subscriptionLabels: Record<string, string> = {
  draft: "черновик",
  pending: "ожидает подтверждения",
  active: "активна",
  paused: "приостановлена",
  cancelled: "отменена",
  expired: "завершена",
};

function dueLabel(value: string, timezone: string) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: timezone }).format(date);
  return `${datePart}, ${eventTime(value, timezone)}`;
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function Dashboard({ data, paymentError, aiEnabled = false }: { data: StudentLearningData; paymentError?: string; aiEnabled?: boolean }) {
  const { identity } = data;
  const firstName = identity.name.trim().split(/\s+/)[0] || "ученик";
  const now = new Date(data.generatedAt).getTime();
  const upcoming = data.events.filter((event) => event.status !== "cancelled" && new Date(event.endsAt).getTime() >= now);
  const nextEvent = upcoming[0] ?? null;
  const today = upcoming.filter((event) => isEventToday(event, identity.timezone, data.generatedAt));
  const date = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: identity.timezone }).format(new Date(data.generatedAt));

  return <StudentShell identity={identity} active="home">
    <div className="student-page student-dashboard">
      <header className="student-page-heading">
        <div><span className="student-eyebrow">Сегодня · <span className="capitalize">{date}</span></span><h1>Привет, {firstName}.</h1><p>Сначала — ближайшее действие. Остальная статистика не мешает учиться.</p></div>
        <div className="flex flex-wrap justify-end gap-2">{data.activity.streakDays > 0 && <div className="student-subscription"><small>Ритм</small><b>{data.activity.streakDays} дн. подряд · {data.activity.weeklyPoints} б. за неделю</b></div>}{data.subscription && <div className={`student-subscription student-subscription-${data.subscription.status}`}><small>{data.subscription.planName}</small><b>{subscriptionLabels[data.subscription.status] ?? data.subscription.status}</b></div>}</div>
      </header>

      {paymentError && <section className="student-notice" role="alert"><AlertCircle aria-hidden="true" /><div><b>Оплата не началась</b><p>{paymentError}</p></div></section>}
      {data.subscription?.status === "pending" && <section className="student-notice" role="status"><AlertCircle aria-hidden="true" /><div><b>Подписка ждёт оплаты</b><p>Стоимость: {money(data.subscription.priceMinor, data.subscription.currency)}. После подтверждённого webhook доступ активируется автоматически.</p><form action={beginSubscriptionPayment} className="mt-4"><input type="hidden" name="subscriptionId" value={data.subscription.id} /><input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} /><button className="button button-primary">Перейти к безопасной оплате</button></form></div></section>}
      {data.subscription && !["active", "pending"].includes(data.subscription.status) && <section className="student-notice" role="status"><AlertCircle aria-hidden="true" /><div><b>Доступ к занятиям не активирован</b><p>Статус подписки: {subscriptionLabels[data.subscription.status] ?? data.subscription.status}. Обратитесь в поддержку elio.</p></div></section>}
      <StudentWeeklyGoal points={data.activity.weeklyPoints} target={data.activity.weeklyGoalPoints} />
      {data.activity.achievements.length > 0 && <p className="student-achievements" aria-label="Достигнутые этапы">{data.activity.achievements.join(" · ")}</p>}

      <section className="student-dashboard-grid" aria-label="Главное на сегодня">
        <article className="student-next-card">
          <div className="student-card-heading"><div><small>Главное действие</small><h2>{nextEvent ? nextEvent.title : "В расписании пока пусто"}</h2></div><CalendarDays aria-hidden="true" /></div>
          {nextEvent ? <><div className="student-next-meta"><span>{nextEvent.subject ?? "Учебное событие"}</span><b>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: identity.timezone }).format(new Date(nextEvent.startsAt))}, {eventTime(nextEvent.startsAt, identity.timezone)}</b>{nextEvent.teacher && <span>{nextEvent.teacher}</span>}</div><div className="student-next-actions">{nextEvent.joinUrl ? <a className="button button-primary" href={nextEvent.joinUrl} target="_blank" rel="noreferrer">Подключиться</a> : nextEvent.lessonId ? <Link className="button button-light" href={`/student/lessons/${nextEvent.lessonId}`}>Открыть урок</Link> : null}<Link href="/student/schedule">Всё расписание <ArrowRight aria-hidden="true" /></Link></div></> : <div className="student-empty-on-dark"><CheckCircle2 aria-hidden="true" /><p>Новых занятий нет. Когда администратор добавит вас в активную группу, событие появится автоматически.</p></div>}
        </article>

        <article className="student-tasks-card">
          <div className="student-card-heading"><div><small>Фокус</small><h2>Что сделать сегодня</h2></div><Target aria-hidden="true" /></div>
          {data.tasks.length ? <div className="student-task-list">{data.tasks.slice(0, 5).map((task) => <div className={task.overdue ? "is-overdue" : ""} key={task.id}><span>{task.overdue ? <AlertCircle aria-hidden="true" /> : <BookOpen aria-hidden="true" />}</span><div><b>{task.title}</b><small>{task.subject}</small></div><time dateTime={task.dueAt}>{task.overdue ? "Просрочено · " : "До "}{dueLabel(task.dueAt, identity.timezone)}</time></div>)}</div> : <div className="student-empty"><CheckCircle2 aria-hidden="true" /><b>Нет срочных заданий</b><p>Домашние задания появятся здесь после публикации преподавателем.</p></div>}
        </article>
      </section>

      <section className="student-ai-card" aria-labelledby="student-ai-title">
        <div><span className="student-eyebrow">ELIO AI · Beta</span><h2 id="student-ai-title">понять ошибку.<br />выбрать следующий шаг.</h2><p>{aiEnabled ? "Наставник использует ваши предметы, цели и проверенные результаты, но ничего не меняет без вашего действия." : "AI-наставник появится после безопасной настройки provider. Учебные данные не заменяются демонстрационными ответами."}</p></div>
        <div><span>Объясни тему</span><span>Почему ошибка?</span><span>Что делать дальше?</span>{aiEnabled ? <Link className="button button-primary" href="/student/ai">Открыть ELIO AI <ArrowRight aria-hidden="true" /></Link> : <button className="button button-secondary" type="button" disabled>Пока недоступно</button>}</div>
      </section>

      <section className="student-section">
        <div className="student-section-heading"><div><span className="student-eyebrow">План дня</span><h2>{today.length ? `Сегодня ${today.length} ${today.length === 1 ? "событие" : "события"}` : "Сегодня без занятий"}</h2></div><Link href="/student/schedule">Открыть расписание <ArrowRight aria-hidden="true" /></Link></div>
        {today.length ? <div className="student-event-list">{today.map((event) => <StudentEventCard event={event} timezone={identity.timezone} key={event.id} />)}</div> : <div className="student-empty student-empty-wide"><Clock3 aria-hidden="true" /><b>Можно сосредоточиться на самостоятельной работе</b><p>Недельный план и будущие занятия находятся в разделе расписания.</p></div>}
      </section>

      <section className="student-section">
        <div className="student-section-heading"><div><span className="student-eyebrow">Ваши цели</span><h2>Предметы</h2></div></div>
        {data.subjects.length ? <div className="student-subject-grid">{data.subjects.map((subject) => { const progress = data.progress.find((item) => item.subjectId === subject.subjectId); return <article key={subject.id}><small>{subject.scoreUnit === "primary_score" ? "Первичный балл" : "Тестовый балл"}</small><h3>{subject.name}</h3><div><b>{subject.target}</b><span>цель</span></div>{progress ? <><p>{progress.completedLessons} уроков пройдено · {progress.percent}% курса</p>{progress.currentStage && <p>Следующий шаг: {progress.currentStage}</p>}</> : <p>Прогресс начнёт считаться после назначения активного курса.</p>}</article>; })}</div> : <div className="student-empty student-empty-wide"><BookOpen aria-hidden="true" /><b>Предметы пока не назначены</b><p>Выбранные и оплаченные предметы появятся после завершения онбординга и активации подписки.</p></div>}
      </section>
    </div>
  </StudentShell>;
}
