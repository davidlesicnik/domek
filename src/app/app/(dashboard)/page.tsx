import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

export default async function Home() {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  const members = membership
    ? await prisma.householdMember.findMany({
        orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
        select: {
          color: true,
          id: true,
          user: { select: { email: true, name: true } },
        },
        where: { householdId: membership.householdId },
      })
    : [];

  return (
    <DashboardOverview
      members={members.map((member) => ({
        color: member.color,
        email: member.user.email,
        id: member.id,
        name: member.user.name,
      }))}
    />
  );
}
