import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { StudentEventCard, eventDate } from "@/components/student-event-card";
import { StudentShell } from "@/components/student-shell";
import { getStudentLearningData } from "@/lib/student-learning";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage() {
  const data = await getStudentLearningData();
  const now = new Date(data.generatedAt).getTime();
  const future = data.events.filter((event) => new Date(event.endsAt).getTime() >= now);
  const grouped = new Map<string, typeof future>();
  for (const event of future) {
    const key = eventDate(event.startsAt, data.identity.timezone);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  return <StudentShell identity={data.identity} active="schedule">
    <div className="student-page">
      <nav aria-label="Хлебные крошки" className="student-breadcrumb"><Link href="/student">Сегодня</Link><ChevronRight aria-hidden="true" /><span>Расписание</span></nav>
      <header className="student-page-heading"><div><span className="student-eyebrow">Время показано в {data.identity.timezone}</span><h1>Расписание</h1><p>Ближайшие занятия, консультации и другие учебные события. Все даты автоматически показаны в вашем часовом поясе.</p></div></header>
      {grouped.size ? <div className="student-agenda">{[...grouped.entries()].map(([date, events]) => <section key={date}><h2>{date}</h2><div className="student-event-list">{events.map((event) => <StudentEventCard event={event} timezone={data.identity.timezone} key={event.id} prominent />)}</div></section>)}</div> : <div className="student-empty student-empty-page"><CalendarDays aria-hidden="true" /><b>Расписание пока не составлено</b><p>После активации подписки и добавления в группу будущие занятия появятся здесь автоматически.</p></div>}
    </div>
  </StudentShell>;
}
