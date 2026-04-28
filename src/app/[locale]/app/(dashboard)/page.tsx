import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { getDashboardData } from "@/lib/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardPage");

  return {
    description: t("metaDescription"),
    title: t("metaTitle"),
  };
}

export default async function Home() {
  const session = await requireHouseholdMemberSession();
  const dashboardData = await getDashboardData(session.user.id);

  if (!dashboardData) {
    return null;
  }

  return <DashboardOverview data={dashboardData} />;
}
