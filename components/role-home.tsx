import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";

export function RoleHome({ title, description, items, action }: { title: string; description: string; items: string[]; action?: { href: string; label: string } }) {
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-5xl"><div className="flex justify-between"><Brand /><span className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><ShieldCheck className="h-4 w-4 text-[var(--brand-primary)]" />Защищённый раздел</span></div><div className="mt-20 grid gap-10 lg:grid-cols-2"><div><h1 className="text-5xl font-extrabold tracking-[-.04em]">{title}</h1><p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{description}</p>{action && <Link className="button button-primary button-large mt-8" href={action.href}>{action.label}</Link>}</div><div className="card p-6"><h2 className="text-xl font-bold">Доступные инструменты</h2><ul className="mt-5 divide-y divide-[var(--border-soft)]">{items.map((item) => <li className="py-4 font-medium" key={item}>→ {item}</li>)}</ul></div></div></div></main>;
}
