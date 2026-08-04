import { ArrowRight, CalendarClock, Radio } from "lucide-react";
import Link from "next/link";
import type { StudentEvent } from "@/types/domain";

const eventLabels: Record<string, string> = {
  live_lesson: "Живой урок",
  consultation: "Консультация",
  mock_exam: "Пробник",
  assignment_deadline: "Дедлайн",
  curator_meeting: "Встреча с куратором",
  individual_lesson: "Индивидуальный урок",
  webinar: "Вебинар",
  intensive: "Интенсив",
};

export function eventDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: timezone }).format(new Date(value));
}

export function eventTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

export function isEventToday(event: StudentEvent, timezone: string, reference: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone });
  return formatter.format(new Date(event.startsAt)) === formatter.format(new Date(reference));
}

export function StudentEventCard({ event, timezone, prominent = false }: { event: StudentEvent; timezone: string; prominent?: boolean }) {
  return <article className={prominent ? "student-event student-event-prominent" : "student-event"}>
    <div className="student-event-date"><CalendarClock aria-hidden="true" /><b>{eventDate(event.startsAt, timezone)}</b><span>{eventTime(event.startsAt, timezone)}–{eventTime(event.endsAt, timezone)}</span></div>
    <div className="student-event-body"><small>{eventLabels[event.eventType] ?? "Событие"}{event.subject ? ` · ${event.subject}` : ""}</small><h3>{event.title}</h3>{event.teacher && <p>{event.teacher}</p>}</div>
    <div className="student-event-actions">
      {event.status === "cancelled" ? <span className="student-status-cancelled">Отменено</span> : event.joinUrl ? <a className="button button-primary button-small" href={event.joinUrl} target="_blank" rel="noreferrer"><Radio aria-hidden="true" />Подключиться</a> : event.lessonId ? <Link aria-label={`Открыть урок ${event.title}`} href={`/student/lessons/${event.lessonId}`}><ArrowRight aria-hidden="true" /></Link> : null}
    </div>
  </article>;
}
