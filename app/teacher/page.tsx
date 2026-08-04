import { TeacherDashboard } from "@/components/role-dashboards";
import { getTeacherDashboardData } from "@/lib/role-dashboards";
export const dynamic = "force-dynamic";
export default async function TeacherPage() { return <TeacherDashboard data={await getTeacherDashboardData()} />; }
