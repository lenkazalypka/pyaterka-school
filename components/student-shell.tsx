import { BookOpen, CalendarDays, Home, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import type { StudentIdentity } from "@/types/domain";

const navigation = [
  { key: "home", label: "Сегодня", href: "/student", icon: Home },
  { key: "schedule", label: "Расписание", href: "/student/schedule", icon: CalendarDays },
  { key: "lessons", label: "Уроки", href: "/student/lessons", icon: BookOpen },
] as const;

const future = ["Пробники", "Прогресс", "Сообщения"];

export function StudentShell({
  identity,
  active,
  children,
}: {
  identity: StudentIdentity;
  active: (typeof navigation)[number]["key"];
  children: React.ReactNode;
}) {
  return <div className="student-app">
    <aside className="student-sidebar">
      <Brand inverse />
      <nav aria-label="Навигация ученика" className="student-navigation">
        {navigation.map(({ key, label, href, icon: Icon }) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "is-active" : ""} href={href} key={key}><Icon aria-hidden="true" />{label}</Link>)}
      </nav>
      <div className="student-future" aria-label="Будущие разделы">
        {future.map((label) => <span key={label}><LockKeyhole aria-hidden="true" />{label}<small>скоро</small></span>)}
      </div>
      <div className="student-user">
        <span aria-hidden="true">{identity.name.slice(0, 1).toUpperCase()}</span>
        <div><b>{identity.name}</b><small>{identity.grade} класс</small></div>
      </div>
      <Link className="student-exit" href="/"><LogOut aria-hidden="true" />На сайт школы</Link>
    </aside>
    <main className="student-content">
      <header className="student-mobile-header"><Brand /><span>{identity.grade} класс</span></header>
      {children}
    </main>
    <nav aria-label="Мобильная навигация ученика" className="student-mobile-nav">
      {navigation.map(({ key, label, href, icon: Icon }) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "is-active" : ""} href={href} key={key}><Icon aria-hidden="true" /><span>{label}</span></Link>)}
    </nav>
  </div>;
}
