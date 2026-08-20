import { RoleHome } from "@/components/role-home";
import { requireRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Page() { await requireRole("curator"); return <RoleHome title="Кабинет куратора" description="Прогресс и группы только по закреплённым ученикам." items={["Закреплённые ученики", "Прогресс и дедлайны", "Учебные рекомендации"]} />; }
