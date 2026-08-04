import { ParentDashboard } from "@/components/role-dashboards";
import { getParentDashboardData } from "@/lib/role-dashboards";
export const dynamic = "force-dynamic";
export default async function ParentPage() { return <ParentDashboard data={await getParentDashboardData()} />; }
