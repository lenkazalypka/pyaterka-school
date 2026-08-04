import { CuratorDashboard } from "@/components/role-dashboards";
import { getCuratorDashboardData } from "@/lib/role-dashboards";
export const dynamic = "force-dynamic";
export default async function CuratorPage() { return <CuratorDashboard data={await getCuratorDashboardData()} />; }
