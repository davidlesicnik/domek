import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

export default async function Home() {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  const members = membership
    ? await prisma.householdMember.findMany({
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        select: {
          color: true,
          emoji: true,
          id: true,
          name: true,
          account: { select: { email: true } },
        },
        where: { householdId: membership.householdId },
      })
    : [];

  return (
    <DashboardOverview
      members={members.map((member) => ({
        color: member.color,
        email: member.account?.email ?? null,
        emoji: member.emoji,
        id: member.id,
        name: member.name,
      }))}
    />
  );
}
