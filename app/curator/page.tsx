import { RoleHome } from "@/components/role-home";
import { requireRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Page() { await requireRole("curator"); return <RoleHome title="Кабинет куратора" description="Учебные материалы, прогресс и группы только по закреплённым ученикам." items={["Закреплённые ученики", "Уроки, материалы и ДЗ", "Прогресс и статусы заданий"]} />; }
