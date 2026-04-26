import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { getDashboardData } from "@/lib/dashboard";

export default async function Home() {
  const session = await requireHouseholdMemberSession();
  const dashboardData = await getDashboardData(session.user.id);

  if (!dashboardData) {
    return null;
  }

  return <DashboardOverview data={dashboardData} />;
}
