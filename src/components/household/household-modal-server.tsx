import { prisma } from "@/lib/db";
import { listPendingInvites } from "@/lib/invites";
import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdModalButton } from "@/components/household/household-modal";

export async function HouseholdModalServer({ userId }: { userId: string }) {
  const membership = await getFirstHouseholdMembership(userId);
  if (!membership) return null;

  const [household, members, pendingInvites] = await Promise.all([
    prisma.household.findUnique({
      where: { id: membership.householdId },
      select: { name: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId: membership.householdId },
      select: {
        id: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    membership.role === "OWNER"
      ? listPendingInvites(membership.householdId)
      : Promise.resolve([]),
  ]);

  if (!household) return null;

  return (
    <HouseholdModalButton
      householdName={household.name}
      isOwner={membership.role === "OWNER"}
      members={members}
      pendingInvites={pendingInvites}
    />
  );
}
