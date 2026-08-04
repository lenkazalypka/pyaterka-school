import { AdminDashboard } from "@/components/role-dashboards";
import { getAdminDashboardData } from "@/lib/role-dashboards";
export const dynamic = "force-dynamic";
export default async function AdminPage() { return <AdminDashboard data={await getAdminDashboardData()} />; }
